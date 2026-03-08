#!/bin/bash
# System Health Check
# Run this to verify all services are operational

echo "=== OPENCLAW SYSTEM HEALTH CHECK ==="
echo "$(date)"
echo ""

ERRORS=0

# 1. Dashboard Server
echo -n "Dashboard Server (port 8081): "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/data.json | grep -q "200"; then
    echo "✅ ONLINE"
else
    echo "❌ OFFLINE"
    ((ERRORS++))
fi

# 2. Portfolio Scheduler
echo -n "Portfolio Scheduler: "
if ps aux | grep -q "[p]ortfolio-scheduler.py"; then
    echo "✅ RUNNING"
else
    echo "❌ NOT RUNNING"
    ((ERRORS++))
fi

# 3. Pump.fun Scanner
echo -n "Pump.fun Websocket Scanner: "
if ps aux | grep -q "[p]umpfun-websocket-scanner"; then
    echo "✅ RUNNING"
else
    echo "⚠️ NOT RUNNING"
fi

# 4. Data Freshness
echo -n "Data Freshness (data.json): "
DATA_AGE=$(( $(date +%s) - $(stat -f %m /Users/milo/.openclaw/workspace/shared/crypto-strategy/data.json 2>/dev/null || echo 0) ))
if [ $DATA_AGE -lt 3600 ]; then
    echo "✅ FRESH (${DATA_AGE}s old)"
else
    echo "⚠️ STALE (${DATA_AGE}s old)"
fi

# 5. Databases
echo -n "Databases accessible: "
DBS_OK=0
for db in /Users/milo/.openclaw/workspace/shared/{portfolio,scanner,stocks}.db; do
    if [ -f "$db" ]; then
        ((DBS_OK++))
    fi
done
if [ $DBS_OK -eq 3 ]; then
    echo "✅ ALL (3/3)"
else
    echo "⚠️ SOME MISSING ($DBS_OK/3)"
fi

# 6. Gateway
echo -n "OpenClaw Gateway: "
if ps aux | grep -q "[o]penclaw-gateway"; then
    echo "✅ RUNNING"
else
    echo "❌ NOT RUNNING"
    ((ERRORS++))
fi

echo ""
echo "=== SUMMARY ==="
if [ $ERRORS -eq 0 ]; then
    echo "✅ ALL CRITICAL SERVICES OPERATIONAL"
    exit 0
else
    echo "❌ $ERRORS CRITICAL ISSUES FOUND"
    exit 1
fi
