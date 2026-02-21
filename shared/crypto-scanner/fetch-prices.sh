#!/bin/bash
# fetch-prices.sh — Holt Live-Preise für alle Coins aus DB und speichert sie
# Usage: bash fetch-prices.sh [--json] [--update-db]

DB="/Users/milo/.openclaw/workspace/shared/crypto.db"

# Alle coinpaprika_ids aus DB holen
COINS=$(sqlite3 "$DB" "SELECT symbol || '|' || coinpaprika_id FROM holdings ORDER BY status, symbol")

OUTPUT=""
for row in $COINS; do
    SYM=$(echo "$row" | cut -d'|' -f1)
    CPID=$(echo "$row" | cut -d'|' -f2)
    
    DATA=$(curl -s "https://api.coinpaprika.com/v1/tickers/$CPID" 2>/dev/null)
    PRICE=$(echo "$DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['quotes']['USD']['price'])" 2>/dev/null)
    CHG24=$(echo "$DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['quotes']['USD']['percent_change_24h'])" 2>/dev/null)
    MC=$(echo "$DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['quotes']['USD']['market_cap'])" 2>/dev/null)
    VOL=$(echo "$DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['quotes']['USD']['volume_24h'])" 2>/dev/null)
    
    if [ -n "$PRICE" ] && [ "$PRICE" != "None" ]; then
        echo "$SYM|$PRICE|$CHG24|$MC|$VOL"
        
        if [[ "$*" == *"--update-db"* ]]; then
            DATE=$(date +%Y-%m-%d)
            TIME=$(date +%H:%M)
            sqlite3 "$DB" "INSERT OR REPLACE INTO price_history (coin_symbol, datum, zeit, preis, change_24h, market_cap, volume_24h) VALUES ('$SYM', '$DATE', '$TIME', $PRICE, $CHG24, $MC, $VOL);"
        fi
    fi
done
