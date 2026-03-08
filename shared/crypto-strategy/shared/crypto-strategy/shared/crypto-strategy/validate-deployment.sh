#!/bin/bash
# AUTOMATISCHE VALIDIERUNG NACH JEDEM DEPLOYMENT

echo "🔍 DASHBOARD DEPLOYMENT VALIDATION"
echo "=================================="

# 1. Data.json Check
if [ ! -f "data.json" ]; then
    echo "❌ FEHLER: data.json fehlt!"
    exit 1
fi

# 2. JSON Syntax Check
if ! python3 -m json.tool data.json > /dev/null; then
    echo "❌ FEHLER: Invalide JSON Syntax!"
    exit 1
fi

# 3. Transactions Count
TRANSACTIONS=$(python3 -c "import json; print(len(json.load(open('data.json'))['transactions']))")
if [ "$TRANSACTIONS" -lt 15 ]; then
    echo "❌ FEHLER: Nur $TRANSACTIONS Transaktionen (erwartet: ≥15)"
    exit 1
fi

# 4. Timestamp Check (max 10 Min alt)
EXPORT_TIME=$(python3 -c "
import json
from datetime import datetime
data = json.load(open('data.json'))
export_ts = datetime.fromisoformat(data['exported_at'].replace('Z', '+00:00'))
now = datetime.now().replace(tzinfo=export_ts.tzinfo)
diff = (now - export_ts).total_seconds()
print(int(diff))
")

if [ "$EXPORT_TIME" -gt 600 ]; then
    echo "❌ FEHLER: Export ist $EXPORT_TIME Sekunden alt (max 600)"
    exit 1
fi

# 5. Git Sync Check
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  WARNING: Uncommitted changes vorhanden"
fi

# 6. Critical Values Check
python3 -c "
import json
data = json.load(open('data.json'))
usdt = data['usdt_free']
total = data['total_with_usdt'] 

if usdt < 1000:
    print('⚠️  WARNING: USDT sehr niedrig:', usdt)
if total < 8000:
    print('⚠️  WARNING: Portfolio-Wert niedrig:', total)
"

echo "✅ VALIDATION PASSED"
echo "📊 $TRANSACTIONS Transaktionen, Export vor ${EXPORT_TIME}s"
echo "🚀 Dashboard ready for production"