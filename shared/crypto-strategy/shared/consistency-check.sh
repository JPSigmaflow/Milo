#!/bin/bash
# K3: Consistency Check DB ↔ MEXC (every 6h)
# Compares portfolio.db holdings against actual MEXC balances

DB="/Users/milo/.openclaw/workspace/shared/portfolio.db"
KEYS=$(cat /Users/milo/.openclaw/workspace/private/mexc-api.json)
API_KEY=$(echo "$KEYS" | python3 -c "import json,sys; print(json.load(sys.stdin)['access_key'])")
SECRET=$(echo "$KEYS" | python3 -c "import json,sys; print(json.load(sys.stdin)['secret_key'])")

TIMESTAMP=$(python3 -c "import time; print(int(time.time()*1000))")
PARAMS="timestamp=$TIMESTAMP"
SIGNATURE=$(echo -n "$PARAMS" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

BALANCES=$(curl -s "https://api.mexc.com/api/v3/account?$PARAMS&signature=$SIGNATURE" -H "X-MEXC-APIKEY: $API_KEY")

# Get DB holdings
DB_HOLDINGS=$(sqlite3 "$DB" "SELECT symbol, amount FROM holdings WHERE status='active' ORDER BY symbol")

echo "=== CONSISTENCY CHECK $(date) ==="
echo "DB Holdings:"
echo "$DB_HOLDINGS"
echo ""
echo "MEXC Balances (non-zero):"
echo "$BALANCES" | python3 -c "
import json,sys
data = json.load(sys.stdin)
balances = data.get('balances', [])
for b in balances:
    free = float(b.get('free', 0))
    locked = float(b.get('locked', 0))
    total = free + locked
    if total > 0.001:
        print(f\"{b['asset']}: {total:.6f}\")
" 2>/dev/null

echo ""
echo "=== Discrepancies ==="
# Compare each DB holding against MEXC
echo "$DB_HOLDINGS" | while IFS='|' read -r sym amt; do
    mexc_amt=$(echo "$BALANCES" | python3 -c "
import json,sys
data = json.load(sys.stdin)
for b in data.get('balances', []):
    if b['asset'] == '$sym':
        print(float(b.get('free',0)) + float(b.get('locked',0)))
        sys.exit()
print(0)
" 2>/dev/null)
    
    diff=$(python3 -c "
db=$amt; mexc=${mexc_amt:-0}
pct = abs(db-mexc)/max(db,0.001)*100
if pct > 5: print(f'⚠️ {\"$sym\"}: DB={db:.2f} MEXC={mexc:.2f} ({pct:.1f}% diff)')
elif pct > 0.1: print(f'ℹ️ {\"$sym\"}: DB={db:.2f} MEXC={mexc:.2f} (minor {pct:.1f}%)')
" 2>/dev/null)
    
    [ -n "$diff" ] && echo "$diff"
done

echo "✅ Check complete"
