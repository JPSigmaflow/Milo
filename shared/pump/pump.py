#!/usr/bin/env python3
"""
PumpWatch Historian — Sub-Agent von Milo
=========================================
Nutzt die bestehende pumpfun-tracker.db!
Speichert ALLE Pump.fun Coin-Bewertungen dauerhaft.
Dashboard ab Score >= 8.

REGELN (NICHT VERHANDELBAR):
1) Scope: Nur Pump.fun Coins
2) Jede Bewertung wird gespeichert (auch Score < 8)
3) Dashboard ab Score >= 8
4) Status enthält: Dashboard-Zusammenfassung, Neu seit letztem Status, Breakdown >=8 / <8
5) 12 Kriterien dürfen NICHT verändert werden
"""

from datetime import datetime, timezone
import json
import hashlib
import os
import sqlite3

DB_PATH = "/Users/milo/.openclaw/workspace/shared/pumpfun-tracker/pumpfun-tracker.db"
DASHBOARD_THRESHOLD = 8


def utcnow():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


# ──────────────────────────────────────
# CORE LOGIC
# ──────────────────────────────────────
def add_evaluation(mint, name, symbol, score, criteria, mc, price):
    """
    Speichert eine Bewertung. JEDE Bewertung wird gespeichert (auch < 8).
    Coin wird in watchlist_coins angelegt falls neu.
    """
    db = get_db()
    try:
        coin = db.execute("SELECT id FROM watchlist_coins WHERE token_address = ?", (mint,)).fetchone()
        if not coin:
            db.execute("""
                INSERT INTO watchlist_coins (chain, token_address, token_name, symbol, added_at, score, criteria_json, mc_at_add, entry_price_usd)
                VALUES ('solana', ?, ?, ?, ?, ?, ?, ?, ?)
            """, (mint, name, symbol, utcnow(), score, json.dumps(criteria, ensure_ascii=False), mc, price))
            db.commit()
            coin = db.execute("SELECT id FROM watchlist_coins WHERE token_address = ?", (mint,)).fetchone()

        dashboard = 1 if score >= DASHBOARD_THRESHOLD else 0
        db.execute("""
            INSERT INTO evaluations (coin_id, evaluated_at, score, criteria_json, marketcap, price, dashboard)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (coin['id'], utcnow(), score, json.dumps(criteria, ensure_ascii=False), mc, price, dashboard))
        db.commit()
        return {"coin_id": coin['id'], "dashboard": bool(dashboard)}
    finally:
        db.close()


def get_last_cutoff():
    db = get_db()
    try:
        row = db.execute("SELECT cutoff FROM status_reports ORDER BY reported_at DESC LIMIT 1").fetchone()
        return row['cutoff'] if row else "1970-01-01 00:00:00"
    finally:
        db.close()


def generate_status():
    """
    Erzeugt einen Status-Report mit:
    - Dashboard-Zusammenfassung (Score >= 8)
    - Neu seit letztem Status
    - Breakdown >= 8 / < 8
    """
    db = get_db()
    try:
        cutoff = get_last_cutoff()
        now = utcnow()

        # Neue Bewertungen seit letztem Report
        new_evals = db.execute("SELECT * FROM evaluations WHERE evaluated_at > ?", (cutoff,)).fetchall()

        # Gesamt
        total_coins = db.execute("SELECT COUNT(*) as c FROM watchlist_coins").fetchone()['c']
        total_evals = db.execute("SELECT COUNT(*) as c FROM evaluations").fetchone()['c']
        dash_evals = db.execute("SELECT COUNT(*) as c FROM evaluations WHERE dashboard = 1").fetchone()['c']
        below = total_evals - dash_evals

        new_dash = [e for e in new_evals if e['dashboard']]
        new_below = [e for e in new_evals if not e['dashboard']]

        # Dashboard coins (letzte Bewertung >= 8)
        dashboard_coins = []
        coins = db.execute("SELECT DISTINCT coin_id FROM evaluations WHERE dashboard = 1").fetchall()
        for row in coins:
            latest = db.execute("""
                SELECT e.*, w.token_name, w.symbol, w.token_address
                FROM evaluations e JOIN watchlist_coins w ON e.coin_id = w.id
                WHERE e.coin_id = ? ORDER BY e.evaluated_at DESC LIMIT 1
            """, (row['coin_id'],)).fetchone()
            if latest and latest['dashboard']:
                dashboard_coins.append({
                    "name": latest['token_name'],
                    "symbol": latest['symbol'],
                    "mint": latest['token_address'],
                    "score": latest['score'],
                    "price": latest['price'],
                    "mc": latest['marketcap']
                })

        summary = {
            "generated_at": now,
            "since_last_report": cutoff,
            "total_coins_tracked": total_coins,
            "total_evaluations": total_evals,
            "dashboard_coins_count": len(dashboard_coins),
            "breakdown": {"score_gte_8": dash_evals, "score_lt_8": below},
            "new_since_last": {
                "total": len(new_evals),
                "dashboard_qualified": len(new_dash),
                "below_threshold": len(new_below)
            },
            "dashboard": sorted(dashboard_coins, key=lambda x: x['score'], reverse=True)
        }

        # Speichere Report
        summary_str = json.dumps(summary, sort_keys=True)
        report_hash = hashlib.sha256(summary_str.encode()).hexdigest()[:16]
        db.execute("""
            INSERT OR IGNORE INTO status_reports (reported_at, cutoff, summary_json, hash)
            VALUES (?, ?, ?, ?)
        """, (now, now, json.dumps(summary, ensure_ascii=False, indent=2), report_hash))
        db.commit()

        return summary
    finally:
        db.close()


def format_status_text(summary):
    """Formatiert den Status als lesbaren Text für Telegram."""
    lines = []
    lines.append("📊 PumpWatch Status Report")
    lines.append(f"🕐 {summary['generated_at'][:16]} UTC")
    lines.append(f"📋 Seit letztem Report: {summary['since_last_report'][:16]}")
    lines.append("")
    lines.append(f"🔢 Coins tracked: {summary['total_coins_tracked']}")
    lines.append(f"📝 Bewertungen gesamt: {summary['total_evaluations']}")
    lines.append("")
    lines.append("── Breakdown ──")
    lines.append(f"🟢 Score ≥ 8 (Dashboard): {summary['breakdown']['score_gte_8']}")
    lines.append(f"🔴 Score < 8: {summary['breakdown']['score_lt_8']}")
    lines.append("")
    lines.append(f"── Neu seit letztem Report ({summary['new_since_last']['total']}) ──")
    lines.append(f"  🟢 Dashboard: {summary['new_since_last']['dashboard_qualified']}")
    lines.append(f"  🔴 Unter Schwelle: {summary['new_since_last']['below_threshold']}")

    if summary['dashboard']:
        lines.append("")
        lines.append("── Dashboard Coins (Score ≥ 8) ──")
        for c in summary['dashboard']:
            mc_str = f"${c['mc']:,.0f}" if c['mc'] else "N/A"
            price_str = f"${c['price']:.6f}" if c['price'] else "N/A"
            lines.append(f"  • {c['symbol']} — Score: {c['score']}/12 | MC: {mc_str} | {price_str}")

    return "\n".join(lines)


def get_coin_history(mint):
    db = get_db()
    try:
        coin = db.execute("SELECT * FROM watchlist_coins WHERE token_address = ?", (mint,)).fetchone()
        if not coin:
            return None
        evals = db.execute("SELECT * FROM evaluations WHERE coin_id = ? ORDER BY evaluated_at DESC", (coin['id'],)).fetchall()
        snaps = db.execute("SELECT * FROM snapshots WHERE coin_id = ? ORDER BY ts DESC", (coin['id'],)).fetchall()
        return {
            "coin": {"name": coin['token_name'], "symbol": coin['symbol'], "mint": mint},
            "evaluations": [{"score": e['score'], "at": e['evaluated_at'], "price": e['price'], "mc": e['marketcap'], "dashboard": bool(e['dashboard'])} for e in evals],
            "snapshots": [{"ts": s['ts'], "price": s['price_usd'], "mc": s['market_cap'], "vol": s['volume_24h']} for s in snaps]
        }
    finally:
        db.close()


# ──────────────────────────────────────
# CLI
# ──────────────────────────────────────
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: pump.py [status|dashboard|history <mint>|stats]")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "status":
        summary = generate_status()
        print(format_status_text(summary))

    elif cmd == "dashboard":
        db = get_db()
        coins = db.execute("SELECT DISTINCT coin_id FROM evaluations WHERE dashboard = 1").fetchall()
        for row in coins:
            latest = db.execute("""
                SELECT e.*, w.token_name, w.symbol FROM evaluations e
                JOIN watchlist_coins w ON e.coin_id = w.id
                WHERE e.coin_id = ? ORDER BY e.evaluated_at DESC LIMIT 1
            """, (row['coin_id'],)).fetchone()
            if latest and latest['dashboard']:
                print(f"  🟢 {latest['symbol']} — Score: {latest['score']}/12 | MC: ${latest['marketcap']:,.0f}")
        db.close()

    elif cmd == "history" and len(sys.argv) >= 3:
        hist = get_coin_history(sys.argv[2])
        print(json.dumps(hist, indent=2) if hist else "Coin nicht gefunden")

    elif cmd == "stats":
        db = get_db()
        tc = db.execute("SELECT COUNT(*) as c FROM watchlist_coins").fetchone()['c']
        te = db.execute("SELECT COUNT(*) as c FROM evaluations").fetchone()['c']
        ts = db.execute("SELECT COUNT(*) as c FROM snapshots").fetchone()['c']
        td = db.execute("SELECT COUNT(DISTINCT coin_id) as c FROM evaluations WHERE dashboard = 1").fetchone()['c']
        db.close()
        print(f"Coins: {tc} | Bewertungen: {te} | Snapshots: {ts} | Dashboard: {td}")

    else:
        print(f"Unknown: {cmd}")
