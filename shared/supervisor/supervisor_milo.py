#!/usr/bin/env python3
"""
Milo Supervisor — Phase 2: Infrastructure + KPI-based Bot Health Monitor.
Checks not just "is the bot alive?" but "is it doing its job?"
"""

import asyncio
import json
import logging
import os
import re
import sqlite3
import subprocess
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
from pathlib import Path
from typing import Optional

# ─── Config ───────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent
CONFIG_PATH = BASE_DIR / "bots_config.json"
EST = timezone(timedelta(hours=-5))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("supervisor")


# ─── Models ───────────────────────────────────────────────────────────────────

class BotState(str, Enum):
    OK = "ok"
    DEGRADED = "degraded"
    DOWN = "down"
    DISABLED = "disabled"


class CheckResult(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    WARN = "warn"
    SKIP = "skip"


@dataclass
class HealthCheck:
    name: str
    result: CheckResult
    message: str
    latency_ms: float = 0.0
    timestamp: float = field(default_factory=time.time)


@dataclass
class KPIResult:
    kpi_id: str
    name: str
    passed: bool
    score: float  # 0.0 - 1.0
    detail: str
    weight: int = 0


@dataclass
class CircuitBreaker:
    failures: int = 0
    last_failure: float = 0.0
    open: bool = False
    opened_at: float = 0.0


# ─── Audit DB ─────────────────────────────────────────────────────────────────

class AuditDB:
    def __init__(self, path: str):
        self.conn = sqlite3.connect(path)
        self.conn.execute("PRAGMA journal_mode=WAL")
        self._init_tables()

    def _init_tables(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS health_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts REAL NOT NULL,
                bot_id TEXT NOT NULL,
                check_name TEXT NOT NULL,
                result TEXT NOT NULL,
                message TEXT,
                latency_ms REAL
            );
            CREATE TABLE IF NOT EXISTS state_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts REAL NOT NULL,
                bot_id TEXT NOT NULL,
                old_state TEXT,
                new_state TEXT NOT NULL,
                reason TEXT
            );
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts REAL NOT NULL,
                bot_id TEXT,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                delivered INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_health_ts ON health_log(ts);
            CREATE INDEX IF NOT EXISTS idx_health_bot ON health_log(bot_id);
        """)
        self.conn.commit()

    def log_check(self, bot_id: str, check: HealthCheck):
        self.conn.execute(
            "INSERT INTO health_log (ts, bot_id, check_name, result, message, latency_ms) VALUES (?,?,?,?,?,?)",
            (check.timestamp, bot_id, check.name, check.result.value, check.message, check.latency_ms),
        )
        self.conn.commit()

    def log_state_change(self, bot_id: str, old: Optional[str], new: str, reason: str):
        self.conn.execute(
            "INSERT INTO state_log (ts, bot_id, old_state, new_state, reason) VALUES (?,?,?,?,?)",
            (time.time(), bot_id, old, new, reason),
        )
        self.conn.commit()

    def log_alert(self, bot_id: Optional[str], level: str, message: str):
        self.conn.execute(
            "INSERT INTO alerts (ts, bot_id, level, message) VALUES (?,?,?,?)",
            (time.time(), bot_id, level, message),
        )
        self.conn.commit()

    def get_error_rate(self, bot_id: str, window_seconds: int = 3600) -> float:
        since = time.time() - window_seconds
        row = self.conn.execute(
            "SELECT COUNT(*) as total, SUM(CASE WHEN result='fail' THEN 1 ELSE 0 END) as fails "
            "FROM health_log WHERE bot_id=? AND ts>?",
            (bot_id, since),
        ).fetchone()
        total, fails = row
        return (fails / total) if total > 0 else 0.0

    def get_daily_summary(self) -> list[dict]:
        since = time.time() - 86400
        rows = self.conn.execute(
            "SELECT bot_id, result, COUNT(*) FROM health_log WHERE ts>? GROUP BY bot_id, result ORDER BY bot_id",
            (since,),
        ).fetchall()
        summary = {}
        for bot_id, result, count in rows:
            summary.setdefault(bot_id, {})[result] = count
        return [{"bot_id": k, **v} for k, v in summary.items()]


# ─── Health Checkers ──────────────────────────────────────────────────────────

async def run_cmd(cmd: str, timeout: float = 30) -> tuple[int, str]:
    try:
        proc = await asyncio.create_subprocess_shell(
            cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return proc.returncode or 0, stdout.decode(errors="replace").strip()
    except asyncio.TimeoutError:
        return -1, "timeout"
    except Exception as e:
        return -1, str(e)


async def check_session(agent_name: str) -> HealthCheck:
    t0 = time.time()
    rc, output = await run_cmd("pgrep -f 'openclaw' | head -1")
    latency = (time.time() - t0) * 1000
    if rc == 0 and output.strip():
        return HealthCheck("session", CheckResult.PASS, f"OpenClaw running (pid {output.strip().splitlines()[0]})", latency)
    else:
        return HealthCheck("session", CheckResult.WARN, "OpenClaw process not found", latency)


async def check_crons(agent_name: str, crons: list[dict]) -> list[HealthCheck]:
    results = []
    t0 = time.time()
    rc, output = await run_cmd("openclaw cron list 2>/dev/null || echo '__no_cli__'")
    latency = (time.time() - t0) * 1000

    if "__no_cli__" in output or rc != 0:
        sup_db = BASE_DIR / "supervisor.db"
        if sup_db.exists():
            results.append(HealthCheck("crons", CheckResult.PASS, "Supervisor DB exists, cron CLI unavailable", latency))
        else:
            results.append(HealthCheck("crons", CheckResult.SKIP, "openclaw cron CLI not available", latency))
        return results

    for cron in crons:
        name = cron["name"]
        if name.lower() in output.lower():
            for line in output.splitlines():
                if name.lower() in line.lower():
                    if "ok" in line.lower():
                        results.append(HealthCheck(f"cron:{name}", CheckResult.PASS, f"Cron '{name}' active & ok", latency))
                    else:
                        results.append(HealthCheck(f"cron:{name}", CheckResult.WARN, f"Cron '{name}' found but status unclear", latency))
                    break
        else:
            results.append(HealthCheck(f"cron:{name}", CheckResult.PASS, f"Cron '{name}' — no exact match, skipped", latency))

    return results


async def check_database(db_cfg: dict) -> HealthCheck:
    path = db_cfg["path"]
    name = db_cfg["name"]
    t0 = time.time()

    if not os.path.exists(path):
        return HealthCheck(f"db:{name}", CheckResult.FAIL, f"DB not found: {path}", 0)

    try:
        fsize = os.path.getsize(path)
        if fsize == 0:
            return HealthCheck(f"db:{name}", CheckResult.WARN, f"{name} exists but empty (0 bytes)", (time.time() - t0) * 1000)
        conn = sqlite3.connect(path, timeout=5)
        result = conn.execute("PRAGMA integrity_check").fetchone()
        conn.close()
        latency = (time.time() - t0) * 1000

        if result and result[0] == "ok":
            mtime = os.path.getmtime(path)
            age_hours = (time.time() - mtime) / 3600
            msg = f"{name} OK ({fsize/1024:.0f}KB, modified {age_hours:.1f}h ago)"
            return HealthCheck(f"db:{name}", CheckResult.PASS, msg, latency)
        else:
            return HealthCheck(f"db:{name}", CheckResult.FAIL, f"Integrity check failed: {result}", latency)
    except Exception as e:
        latency = (time.time() - t0) * 1000
        return HealthCheck(f"db:{name}", CheckResult.FAIL, f"DB error: {e}", latency)


# ─── KPI Checkers (Phase 2) ──────────────────────────────────────────────────

# Cached cron list (fetched once per cycle)
_cron_cache: dict = {"output": "", "fetched": 0.0}


async def get_cron_list() -> str:
    """Fetch cron list once per cycle (cached for 60s)."""
    if time.time() - _cron_cache["fetched"] < 60:
        return _cron_cache["output"]
    rc, output = await run_cmd("openclaw cron list 2>/dev/null")
    if rc == 0:
        _cron_cache["output"] = output
        _cron_cache["fetched"] = time.time()
    return _cron_cache["output"]


def parse_last_run_age(cron_output: str, cron_name: str) -> Optional[float]:
    """Parse the 'Last' column from openclaw cron list and return age in hours.
    Format examples: '12m ago', '5h ago', '19h ago', '6d ago', '-' (never)
    """
    for line in cron_output.splitlines():
        if cron_name.lower() in line.lower():
            # Parse the "Last" column — look for patterns like "12m ago", "5h ago", "6d ago"
            match = re.search(r'(\d+)(m|h|d)\s+ago', line)
            if match:
                val = int(match.group(1))
                unit = match.group(2)
                if unit == 'm':
                    return val / 60.0
                elif unit == 'h':
                    return float(val)
                elif unit == 'd':
                    return val * 24.0
            # Check for '-' meaning never run
            if re.search(r'\s+-\s+', line):
                return None
    return None


async def kpi_cron_recency(kpi: dict) -> KPIResult:
    """Check if a cron job ran within max_age_hours."""
    cron_name = kpi["cron_name"]
    max_age = kpi["max_age_hours"]
    cron_output = await get_cron_list()

    if not cron_output:
        return KPIResult(kpi["id"], kpi["name"], False, 0.0, "Cron CLI unavailable", kpi["weight"])

    age_hours = parse_last_run_age(cron_output, cron_name)

    if age_hours is None:
        # Check if cron exists but never ran
        if any(cron_name.lower() in line.lower() for line in cron_output.splitlines()):
            return KPIResult(kpi["id"], kpi["name"], False, 0.0, "Never ran", kpi["weight"])
        return KPIResult(kpi["id"], kpi["name"], False, 0.0, f"Cron '{cron_name}' not found", kpi["weight"])

    if age_hours <= max_age:
        score = max(0.0, 1.0 - (age_hours / max_age) * 0.3)  # Gradual degradation
        return KPIResult(kpi["id"], kpi["name"], True, score, f"{age_hours:.1f}h ago (max {max_age}h)", kpi["weight"])
    else:
        overdue = age_hours - max_age
        score = max(0.0, 0.5 - (overdue / max_age) * 0.5)
        return KPIResult(kpi["id"], kpi["name"], False, score, f"⚠ {age_hours:.1f}h ago (max {max_age}h)", kpi["weight"])


async def kpi_postplan_recency(kpi: dict) -> KPIResult:
    """Check last posted entry in postplan.json."""
    path = kpi["postplan_path"]
    max_age = kpi["max_age_hours"]

    if not os.path.exists(path):
        return KPIResult(kpi["id"], kpi["name"], False, 0.0, "postplan.json not found", kpi["weight"])

    try:
        with open(path) as f:
            data = json.load(f)

        posts = data.get("plan", data) if isinstance(data, dict) else data
        posted = [p for p in posts if p.get("posted")]

        if not posted:
            return KPIResult(kpi["id"], kpi["name"], False, 0.0, "No posted entries", kpi["weight"])

        # Find most recent by date
        last = max(posted, key=lambda p: p.get("date", ""))
        last_date_str = last.get("date", "")
        try:
            last_date = datetime.strptime(last_date_str, "%Y-%m-%d").replace(tzinfo=EST)
            now = datetime.now(EST)
            age_hours = (now - last_date).total_seconds() / 3600

            if age_hours <= max_age:
                score = max(0.0, 1.0 - (age_hours / max_age) * 0.3)
                return KPIResult(kpi["id"], kpi["name"], True, score,
                                 f"Last post: {last_date_str} ({age_hours:.0f}h ago)", kpi["weight"])
            else:
                return KPIResult(kpi["id"], kpi["name"], False, 0.2,
                                 f"⚠ Last post: {last_date_str} ({age_hours:.0f}h ago, max {max_age}h)", kpi["weight"])
        except ValueError:
            return KPIResult(kpi["id"], kpi["name"], False, 0.0, f"Cannot parse date: {last_date_str}", kpi["weight"])

    except Exception as e:
        return KPIResult(kpi["id"], kpi["name"], False, 0.0, f"Error: {e}", kpi["weight"])


async def kpi_git_recency(kpi: dict) -> KPIResult:
    """Check last git commit age in a repo."""
    git_path = kpi["git_path"]
    max_age = kpi["max_age_hours"]

    if not os.path.isdir(git_path):
        return KPIResult(kpi["id"], kpi["name"], False, 0.0, f"Git dir not found: {git_path}", kpi["weight"])

    rc, output = await run_cmd(f"git -C '{git_path}' log -1 --format='%ct' 2>/dev/null")
    if rc != 0 or not output.strip().isdigit():
        return KPIResult(kpi["id"], kpi["name"], False, 0.0, "No git commits found", kpi["weight"])

    commit_ts = int(output.strip())
    age_hours = (time.time() - commit_ts) / 3600

    if age_hours <= max_age:
        score = max(0.0, 1.0 - (age_hours / max_age) * 0.3)
        return KPIResult(kpi["id"], kpi["name"], True, score, f"{age_hours:.1f}h ago", kpi["weight"])
    else:
        return KPIResult(kpi["id"], kpi["name"], False, 0.2, f"⚠ {age_hours:.1f}h ago (max {max_age}h)", kpi["weight"])


async def kpi_db_recency(kpi: dict) -> KPIResult:
    """Check last entry timestamp in a SQLite table."""
    db_path = kpi["db_path"]
    query = kpi["query"]
    max_age = kpi["max_age_hours"]

    if not os.path.exists(db_path) or os.path.getsize(db_path) == 0:
        return KPIResult(kpi["id"], kpi["name"], False, 0.0, "DB missing or empty", kpi["weight"])

    try:
        conn = sqlite3.connect(db_path, timeout=5)
        row = conn.execute(query).fetchone()
        conn.close()

        if not row or row[0] is None:
            return KPIResult(kpi["id"], kpi["name"], False, 0.0, "No data found", kpi["weight"])

        # Assume result is ISO timestamp or unix epoch
        val = row[0]
        if isinstance(val, (int, float)):
            age_hours = (time.time() - val) / 3600
        else:
            dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
            age_hours = (datetime.now(timezone.utc) - dt).total_seconds() / 3600

        if age_hours <= max_age:
            return KPIResult(kpi["id"], kpi["name"], True, 1.0, f"{age_hours:.1f}h ago", kpi["weight"])
        else:
            return KPIResult(kpi["id"], kpi["name"], False, 0.2, f"⚠ {age_hours:.1f}h ago (max {max_age}h)", kpi["weight"])
    except Exception as e:
        return KPIResult(kpi["id"], kpi["name"], False, 0.0, f"DB error: {e}", kpi["weight"])


# KPI dispatcher
KPI_HANDLERS = {
    "cron_recency": kpi_cron_recency,
    "postplan_recency": kpi_postplan_recency,
    "git_recency": kpi_git_recency,
    "db_recency": kpi_db_recency,
}


async def check_kpis(bot: dict) -> list[KPIResult]:
    """Run all KPI checks for a bot."""
    kpis = bot.get("kpis", [])
    results = []
    for kpi in kpis:
        handler = KPI_HANDLERS.get(kpi["type"])
        if handler:
            try:
                result = await handler(kpi)
                results.append(result)
            except Exception as e:
                results.append(KPIResult(kpi["id"], kpi["name"], False, 0.0, f"Error: {e}", kpi.get("weight", 0)))
        else:
            results.append(KPIResult(kpi["id"], kpi["name"], False, 0.0, f"Unknown KPI type: {kpi['type']}", kpi.get("weight", 0)))
    return results


def calc_performance_score(kpi_results: list[KPIResult]) -> float:
    """Calculate weighted performance score 0-100."""
    if not kpi_results:
        return 100.0  # No KPIs defined = assume OK
    total_weight = sum(k.weight for k in kpi_results)
    if total_weight == 0:
        return 100.0
    weighted_sum = sum(k.score * k.weight for k in kpi_results)
    return (weighted_sum / total_weight) * 100


# ─── Alerting ─────────────────────────────────────────────────────────────────

async def send_telegram_alert(chat_id: str, message: str):
    log.warning(f"ALERT → {message}")
    rc, output = await run_cmd(
        f'openclaw message send --channel telegram --target "{chat_id}" --message "{message.replace(chr(34), chr(39))}" 2>/dev/null'
    )
    if rc != 0:
        log.info(f"Telegram send failed (rc={rc}), alert logged only")


# ─── Supervisor Core ─────────────────────────────────────────────────────────

class Supervisor:
    def __init__(self, config_path: str = str(CONFIG_PATH)):
        with open(config_path) as f:
            self.config = json.load(f)

        self.sup_cfg = self.config["supervisor"]
        self.bots = self.config["bots"]
        self.db = AuditDB(str(BASE_DIR / self.sup_cfg["db_path"]))
        self.states: dict[str, BotState] = {}
        self.breakers: dict[str, CircuitBreaker] = {}

        for bot in self.bots:
            bid = bot["id"]
            self.states[bid] = BotState.OK if bot["enabled"] else BotState.DISABLED
            self.breakers[bid] = CircuitBreaker()

    async def check_bot(self, bot: dict) -> list[HealthCheck]:
        bid = bot["id"]
        checks: list[HealthCheck] = []

        if self.states[bid] == BotState.DISABLED:
            return [HealthCheck("status", CheckResult.SKIP, "Bot disabled")]

        cb = self.breakers[bid]
        if cb.open:
            elapsed = time.time() - cb.opened_at
            if elapsed < self.sup_cfg["circuit_breaker_reset_seconds"]:
                return [HealthCheck("circuit_breaker", CheckResult.SKIP,
                                    f"Circuit open ({elapsed:.0f}s/{self.sup_cfg['circuit_breaker_reset_seconds']}s)")]
            else:
                cb.open = False
                cb.failures = 0

        checks.append(await check_session(bot["agent"]))

        cron_checks = await check_crons(bot["agent"], bot.get("crons", []))
        checks.extend(cron_checks)

        for db_cfg in bot.get("databases", []):
            checks.append(await check_database(db_cfg))

        for c in checks:
            self.db.log_check(bid, c)

        return checks

    def evaluate_state(self, bot_id: str, checks: list[HealthCheck], kpi_score: float) -> BotState:
        """Phase 2: State = Infra + KPI Score combined."""
        if not checks:
            return self.states.get(bot_id, BotState.OK)

        fails = sum(1 for c in checks if c.result == CheckResult.FAIL)
        total = sum(1 for c in checks if c.result != CheckResult.SKIP)

        # Infra failure = DOWN regardless of KPIs
        if fails > 0:
            return BotState.DOWN

        # KPI-based state (Phase 2)
        if kpi_score >= 80:
            return BotState.OK
        elif kpi_score >= 50:
            return BotState.DEGRADED
        else:
            return BotState.DOWN

    def update_circuit_breaker(self, bot_id: str, new_state: BotState):
        cb = self.breakers[bot_id]
        if new_state == BotState.DOWN:
            cb.failures += 1
            cb.last_failure = time.time()
            if cb.failures >= self.sup_cfg["circuit_breaker_threshold"]:
                cb.open = True
                cb.opened_at = time.time()
                log.error(f"Circuit OPEN for {bot_id} after {cb.failures} failures")
                self.states[bot_id] = BotState.DISABLED
                self.db.log_state_change(bot_id, BotState.DOWN.value, BotState.DISABLED.value,
                                         f"Circuit breaker opened after {cb.failures} consecutive failures")
        elif new_state == BotState.OK:
            cb.failures = 0

    async def run_cycle(self):
        log.info("━" * 60)
        log.info("Starting health check cycle (Phase 2: Infra + KPIs)")

        # Reset cron cache for new cycle
        _cron_cache["fetched"] = 0.0

        results = {}
        all_kpis = {}

        for bot in self.bots:
            bid = bot["id"]
            checks = await self.check_bot(bot)

            # Phase 2: KPI checks
            kpi_results = await check_kpis(bot) if self.states[bid] != BotState.DISABLED else []
            kpi_score = calc_performance_score(kpi_results)
            all_kpis[bid] = {"results": kpi_results, "score": kpi_score}

            new_state = self.evaluate_state(bid, checks, kpi_score)
            old_state = self.states[bid]

            if new_state != old_state and old_state != BotState.DISABLED:
                self.db.log_state_change(bid, old_state.value, new_state.value,
                                         f"Health check (KPI: {kpi_score:.0f}%)")
                self.states[bid] = new_state

                if new_state in (BotState.DOWN, BotState.DISABLED):
                    alert_msg = f"🚨 {bot['name']} → {new_state.value.upper()} (KPI: {kpi_score:.0f}%)"
                    self.db.log_alert(bid, "critical", alert_msg)
                    await send_telegram_alert(self.sup_cfg["telegram_chat_id"], alert_msg)
                elif new_state == BotState.DEGRADED:
                    alert_msg = f"⚠️ {bot['name']} → DEGRADED (KPI: {kpi_score:.0f}%)"
                    self.db.log_alert(bid, "warning", alert_msg)
                elif old_state in (BotState.DOWN, BotState.DEGRADED) and new_state == BotState.OK:
                    alert_msg = f"✅ {bot['name']} → RECOVERED (KPI: {kpi_score:.0f}%)"
                    self.db.log_alert(bid, "info", alert_msg)
                    await send_telegram_alert(self.sup_cfg["telegram_chat_id"], alert_msg)

            self.update_circuit_breaker(bid, new_state)
            results[bid] = {"state": self.states[bid], "checks": checks}

        self.print_dashboard(results, all_kpis)
        return results

    def print_dashboard(self, results: dict, all_kpis: dict):
        now = datetime.now(EST).strftime("%Y-%m-%d %H:%M EST")
        print(f"\n{'═' * 80}")
        print(f"  MILO SUPERVISOR v2 — {now}")
        print(f"  Phase 2: Infrastructure + KPI Performance")
        print(f"{'═' * 80}")

        state_icons = {
            BotState.OK: "🟢", BotState.DEGRADED: "🟡",
            BotState.DOWN: "🔴", BotState.DISABLED: "⚫",
        }

        for bot in self.bots:
            bid = bot["id"]
            state = self.states[bid]
            icon = state_icons[state]
            r = results.get(bid, {})
            checks = r.get("checks", [])
            n_pass = sum(1 for c in checks if c.result == CheckResult.PASS)
            n_fail = sum(1 for c in checks if c.result == CheckResult.FAIL)
            cb = self.breakers[bid]
            kpi_data = all_kpis.get(bid, {"score": 0, "results": []})
            kpi_score = kpi_data["score"]
            kpi_results = kpi_data["results"]

            # Score bar visualization
            bar_len = 20
            filled = int(kpi_score / 100 * bar_len)
            bar = "█" * filled + "░" * (bar_len - filled)

            print(f"\n  {icon} {bot['name']:<18} {state.value.upper():<10} Infra: {n_pass}✅ {n_fail}❌  │  KPI: {kpi_score:.0f}% [{bar}]")

            # KPI details
            for kpi in kpi_results:
                kpi_icon = "✅" if kpi.passed else "❌"
                print(f"     {kpi_icon} {kpi.name:<35} {kpi.detail}")

        print(f"\n{'═' * 80}")

        # Legend
        print(f"  State Logic: 🟢 Infra OK + KPI ≥80% │ 🟡 Infra OK + KPI 50-80% │ 🔴 Infra FAIL or KPI <50%")
        print(f"{'═' * 80}\n")

    async def daily_summary(self):
        summary = self.db.get_daily_summary()
        now = datetime.now(EST).strftime("%Y-%m-%d")
        lines = [f"📋 SUPERVISOR DAILY SUMMARY — {now}\n"]

        for bot in self.bots:
            bid = bot["id"]
            state = self.states[bid]
            data = next((s for s in summary if s["bot_id"] == bid), {})
            passes = data.get("pass", 0)
            fails = data.get("fail", 0)
            warns = data.get("warn", 0)
            error_rate = self.db.get_error_rate(bid, 86400)
            lines.append(f"  {bot['name']}: {state.value} | ✅{passes} ⚠️{warns} ❌{fails} | err={error_rate:.1%}")

        msg = "\n".join(lines)
        log.info(msg)
        await send_telegram_alert(self.sup_cfg["telegram_chat_id"], msg)

    async def run(self):
        log.info("Milo Supervisor v2 starting...")
        interval = self.sup_cfg["check_interval_seconds"]
        last_summary = 0

        while True:
            try:
                await self.run_cycle()

                now = datetime.now(EST)
                if now.hour == self.sup_cfg["daily_summary_hour"] and time.time() - last_summary > 3600:
                    await self.daily_summary()
                    last_summary = time.time()

            except Exception as e:
                log.exception(f"Cycle error: {e}")

            await asyncio.sleep(interval)


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Milo Supervisor v2")
    parser.add_argument("--once", action="store_true", help="Run one cycle and exit")
    parser.add_argument("--summary", action="store_true", help="Print daily summary and exit")
    parser.add_argument("--config", default=str(CONFIG_PATH), help="Config file path")
    args = parser.parse_args()

    sup = Supervisor(args.config)

    if args.summary:
        asyncio.run(sup.daily_summary())
    elif args.once:
        asyncio.run(sup.run_cycle())
    else:
        asyncio.run(sup.run())


if __name__ == "__main__":
    main()
