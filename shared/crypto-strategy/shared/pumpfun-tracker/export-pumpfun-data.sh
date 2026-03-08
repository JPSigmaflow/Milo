#!/bin/bash
# Pump.fun Data Export Script
# Exports watchlist + snapshots + listings to JSON for dashboard

set -e

DB="/Users/milo/.openclaw/workspace/shared/pumpfun-tracker/pumpfun-tracker.db"
OUT="/Users/milo/.openclaw/workspace/shared/pumpfun-tracker/pumpfun-data.json"
DASHBOARD_GITHUB="/Users/milo/milo-dashboard/pumpfun-data.json"
DASHBOARD_LOCAL="/Users/milo/.openclaw/workspace/pumpfun-data.json"

echo "[$(date)] Exporting Pump.fun data..."

# Export to JSON
sqlite3 "$DB" <<'SQL' > "$OUT"
.mode json
.once stdout
SELECT 
  datetime('now') as updated_at,
  (SELECT COUNT(*) FROM watchlist_coins) as total_tracked,
  (SELECT MIN(score) FROM watchlist_coins WHERE status='active') as min_score
;
SQL

# Get watchlist data
WATCHLIST=$(sqlite3 "$DB" -json "SELECT id, chain, token_address, token_name as name, symbol, added_at, score, status, dexscreener_url as dexscreener, entry_price_usd as entry_price, mc_at_add, ath_price_usd as ath_price, ath_at, outcome_72h, outcome_14d, outcome_final, category FROM watchlist_coins WHERE status='active' ORDER BY added_at DESC")

# Build final JSON
cat > "$OUT" <<ENDOFFILE
{
  "exported_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "total_tracked": $(sqlite3 "$DB" "SELECT COUNT(*) FROM watchlist_coins WHERE status='active'"),
  "min_score": $(sqlite3 "$DB" "SELECT MIN(score) FROM watchlist_coins WHERE status='active'"),
  "coins": $WATCHLIST
}
ENDOFFILE

# Copy to dashboards
cp "$OUT" "$DASHBOARD_GITHUB"
cp "$OUT" "$DASHBOARD_LOCAL"

echo "✅ Export complete: $OUT"
echo "✅ Copied to GitHub Pages: $DASHBOARD_GITHUB"
echo "✅ Copied to local dashboard: $DASHBOARD_LOCAL"
