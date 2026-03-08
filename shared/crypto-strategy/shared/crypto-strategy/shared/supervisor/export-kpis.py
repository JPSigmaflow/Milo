#!/usr/bin/env python3
"""Export supervisor KPI data to JSON for the crypto dashboard."""

import asyncio
import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Add supervisor dir to path
sys.path.insert(0, str(Path(__file__).parent))
from supervisor_milo import Supervisor, BotState, CheckResult, check_kpis, calc_performance_score

EST = timezone(timedelta(hours=-5))
OUTPUT = Path(__file__).parent.parent / "crypto-dashboard" / "supervisor-kpis.json"

EMOJI_MAP = {
    "milocoach": "🧘",
    "pomi": "🍟",
    "pump": "🎰",
    "guardian": "📊",
    "analyst": "📡",
}


async def export():
    sup = Supervisor()
    # Run a full cycle to get fresh states
    await sup.run_cycle()

    bots_out = []
    for bot in sup.bots:
        bid = bot["id"]
        state = sup.states[bid]
        
        if state == BotState.DISABLED:
            continue

        kpi_results = await check_kpis(bot)
        score = calc_performance_score(kpi_results)

        # Count infra checks
        checks = await sup.check_bot(bot)
        infra_ok = sum(1 for c in checks if c.result == CheckResult.PASS)
        infra_total = sum(1 for c in checks if c.result != CheckResult.SKIP)

        # Parse KPI details for age
        kpis_out = []
        for k in kpi_results:
            # Extract age from detail string
            import re
            age_match = re.search(r'(\d+\.?\d*)\s*h\s+ago', k.detail)
            age_h = float(age_match.group(1)) if age_match else None
            max_match = re.search(r'max\s+(\d+)h', k.detail)
            max_h = int(max_match.group(1)) if max_match else None

            kpis_out.append({
                "name": k.name,
                "status": "ok" if k.passed else "fail",
                "score": round(k.score * 100, 1),
                "detail": k.detail,
                "age_h": age_h,
                "max_h": max_h,
                "weight": k.weight,
            })

        # Clean bot name (remove emoji prefix from config)
        raw_name = bot["name"]
        clean_name = raw_name.lstrip("🧘🍟🎰📊📡 ")

        bots_out.append({
            "name": clean_name,
            "emoji": EMOJI_MAP.get(bid, "🤖"),
            "state": state.value,
            "score": round(score, 1),
            "infra_ok": infra_ok,
            "infra_total": infra_total,
            "kpis": kpis_out,
        })

    data = {
        "exported_at": datetime.now(EST).isoformat(),
        "bots": bots_out,
    }

    OUTPUT.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    print(f"✅ Exported {len(bots_out)} bots to {OUTPUT}")


if __name__ == "__main__":
    asyncio.run(export())
