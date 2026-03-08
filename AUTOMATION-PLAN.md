# AUTOMATION PLAN

## CURRENT STATE (2026-03-07 09:00)

### What EXISTS
- ✅ Portfolio Scheduler (running, 30min updates)
- ✅ Dashboard Server (fixed, running on :8081)
- ✅ Pump.fun Websocket Scanner (PID 38299)
- ⚠️ Sub-agents configured but not running (analyst, pump, pomescoin)
- ❌ No cron jobs

### What's BROKEN
1. No automated scanning
2. Sub-agents not active
3. Pump.fun daily report can't deliver (chat access)
4. No monitoring

## REQUIRED JOBS

Based on STANDARD-PIPELINE (Juri confirmed 2026-02-12):

```
📡 Scanner (5 Min) → pending-alerts.json
🧠 ANALYST (4h)    → reads pending → analyzes → scanner.db
🛡️ GUARDIAN (2h)   → prices → portfolio.db → export → push
📊 Dashboard       → reads data.json
```

### Implementation:

**Option A: Cron Jobs** (traditional)
- Scanner: */5 * * * *
- Analyst: 0 */4 * * *
- Guardian: 0 */2 * * *

**Option B: Sub-Agents** (OpenClaw native)
- Use sessions_spawn for each task
- Better monitoring
- Self-healing

**Option C: Hybrid** (recommended)
- Cron triggers sub-agent spawns
- Best of both worlds

## IMMEDIATE ACTIONS

1. **Document what each job does**
2. **Test all scripts manually**
3. **Choose automation approach**
4. **Implement + monitor**
5. **Fix Pump.fun chat access**

## QUESTIONS FOR DECISION

- Scanner: Which files to run? Found multiple scanners
- Analyst: Sub-agent or script?
- Guardian: Where is it?
- Monitoring: How to alert on failures?

---
Status: PLANNING
Next: Find and test actual automation scripts
