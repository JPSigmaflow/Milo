#!/bin/bash
# Export Pump.Fun tracker data from DB to pumpfun-data.json for dashboard
# Run after each snapshot update (every 6h)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PUMPFUN_DB="/Users/milo/.openclaw/workspace/shared/pumpfun-tracker/pumpfun-tracker.db"
OUTPUT="$SCRIPT_DIR/pumpfun-data.json"
MIN_SCORE=8

if [ ! -f "$PUMPFUN_DB" ]; then
  echo "❌ pumpfun-tracker.db not found"
  exit 1
fi

# Get coins with latest snapshot data
COINS_JSON=$(sqlite3 "$PUMPFUN_DB" "
SELECT json_group_array(json_object(
  'symbol', CASE 
    WHEN w.symbol = '星星' THEN 'XINGXING'
    WHEN w.token_name = 'The Revived Seagull' THEN 'SEAGULL (R)'
    WHEN w.token_name = 'Tung Tung Tung Sahur' THEN 'TUNG'
    WHEN w.token_name = 'Dog saved by Grok' THEN 'GROK DOG'
    ELSE UPPER(COALESCE(w.symbol, w.token_name))
  END,
  'name', CASE
    WHEN w.symbol = '星星' THEN '星星 (XingXing)'
    ELSE w.token_name
  END,
  'chain', w.chain,
  'contract', w.token_address,
  'price', COALESCE(s.price_usd, w.entry_price_usd),
  'entry_price', w.entry_price_usd,
  'change_since_entry', CASE 
    WHEN w.entry_price_usd > 0 AND s.price_usd > 0 
    THEN ROUND((s.price_usd - w.entry_price_usd) / w.entry_price_usd * 100, 2)
    ELSE 0
  END,
  'mc', COALESCE(s.market_cap, w.mc_at_add),
  'volume_1h', NULL,
  'volume_24h', s.volume_24h,
  'liquidity', s.liquidity_usd,
  'score', w.score,
  'criteria', json(w.criteria_json),
  'status', 'tracking',
  'mexc_listed', 0,
  'dexscreener', w.dexscreener_url,
  'added_at', w.added_at,
  'notes', COALESCE(w.notes, ''),
  'project_info', COALESCE(w.notes, ''),
  'ath_price', w.ath_price_usd,
  'ath_at', w.ath_at,
  'max_drawdown_pct', w.max_drawdown_pct,
  'outcome_72h', w.outcome_72h,
  'outcome_14d', w.outcome_14d,
  'outcome_final', w.outcome_final,
  'snapshot_count', (SELECT COUNT(*) FROM snapshots WHERE coin_id = w.id),
  'category', COALESCE(w.category, 'meme')
))
FROM watchlist_coins w
LEFT JOIN (
  SELECT coin_id, price_usd, market_cap, volume_24h, liquidity_usd,
         ROW_NUMBER() OVER (PARTITION BY coin_id ORDER BY ts DESC) as rn
  FROM snapshots
) s ON s.coin_id = w.id AND s.rn = 1
WHERE w.status = 'active' AND (w.score >= $MIN_SCORE OR w.category = 'tech')
ORDER BY w.category, w.score DESC, w.mc_at_add DESC
")

TOTAL=$(sqlite3 "$PUMPFUN_DB" "SELECT COUNT(*) FROM watchlist_coins WHERE status='active' AND (score >= $MIN_SCORE OR category = 'tech')")

cat > "$OUTPUT" << JSONEOF
{
  "exported_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_tracked": $TOTAL,
  "min_score": $MIN_SCORE,
  "coins": $COINS_JSON
}
JSONEOF

# Merge project_info from pumpfun-projects.json
PROJECTS_FILE="$SCRIPT_DIR/pumpfun-projects.json"
if [ -f "$PROJECTS_FILE" ]; then
  python3 -c "
import json
with open('$OUTPUT') as f: data = json.load(f)
with open('$PROJECTS_FILE') as f: projects = json.load(f)
for coin in data.get('coins', []):
    addr = coin.get('contract','')
    if addr in projects:
        coin['project_info'] = projects[addr]
with open('$OUTPUT', 'w') as f: json.dump(data, f, indent=2, ensure_ascii=False)
" 2>/dev/null
fi

# Export snapshot history per coin
HISTORY_JSON=$(sqlite3 "$PUMPFUN_DB" "
SELECT json_group_array(json_object(
  'coin_id', s.coin_id,
  'symbol', CASE 
    WHEN w.symbol = '星星' THEN 'XINGXING'
    WHEN w.token_name = 'The Revived Seagull' THEN 'SEAGULL (R)'
    WHEN w.token_name = 'Tung Tung Tung Sahur' THEN 'TUNG'
    WHEN w.token_name = 'Dog saved by Grok' THEN 'GROK DOG'
    ELSE UPPER(COALESCE(w.symbol, w.token_name))
  END,
  'ts', s.ts,
  'price', s.price_usd,
  'mc', s.market_cap,
  'volume_24h', s.volume_24h,
  'liquidity', s.liquidity_usd,
  'buys', s.txns_24h_buys,
  'sells', s.txns_24h_sells
))
FROM snapshots s
JOIN watchlist_coins w ON w.id = s.coin_id
WHERE w.status = 'active' AND w.score >= $MIN_SCORE
ORDER BY s.coin_id, s.ts ASC
")

# Add history to output
python3 -c "
import json
with open('$OUTPUT') as f: data = json.load(f)
data['snapshot_history'] = json.loads('$HISTORY_JSON')
with open('$OUTPUT', 'w') as f: json.dump(data, f, indent=2, ensure_ascii=False)
" 2>/dev/null

# Fetch LIVE prices from DexScreener (overrides DB snapshot prices)
node "$SCRIPT_DIR/fetch-live-prices.mjs" 2>/dev/null

echo "✅ Pump.Fun exported: $TOTAL coins to $OUTPUT at $(date)"

# Git commit + push
if [ -d "$SCRIPT_DIR/.git" ]; then
  cd "$SCRIPT_DIR"
  git add pumpfun-data.json
  git diff --cached --quiet || {
    git commit -m "🔥 Pump.Fun update $(date +%Y-%m-%d_%H:%M)"
    git push origin main 2>/dev/null || true
  }
fi
