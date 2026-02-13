#!/bin/bash
# Export crypto data from DBs to data.json for dashboard
# Run after each portfolio monitor update

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTFOLIO_DB="/Users/milo/.openclaw/workspace/shared/portfolio.db"
SCANNER_DB="/Users/milo/.openclaw/workspace/shared/crypto-strategy/scanner.db"
OUTPUT="$SCRIPT_DIR/data.json"

# Export holdings
HOLDINGS=$(sqlite3 -json "$PORTFOLIO_DB" "SELECT symbol, name, amount, entry_price, exchange, chain, status, entry_date, current_price, updated_at, sold_price, sold_date FROM holdings ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'watchlist' THEN 1 ELSE 2 END, symbol")

# Export meta
USDT_FREE=$(sqlite3 "$PORTFOLIO_DB" "SELECT value FROM meta WHERE key='usdt_free'")
LAST_UPDATE=$(sqlite3 "$PORTFOLIO_DB" "SELECT value FROM meta WHERE key='last_update'")

# Export price history
PRICE_HISTORY=$(sqlite3 -json "$PORTFOLIO_DB" "SELECT symbol, price, change_24h, market_cap, volume_24h, recorded_at FROM price_history ORDER BY recorded_at ASC")

# Calculate portfolio total value over time
# For each hour: use that hour's price if available, otherwise use latest known price
PORTFOLIO_HISTORY=$(sqlite3 -json "$PORTFOLIO_DB" "
WITH hours AS (
  SELECT DISTINCT strftime('%Y-%m-%d %H:00:00', recorded_at) as hour FROM price_history
),
active AS (
  SELECT symbol, amount FROM holdings WHERE status='active'
),
hourly_prices AS (
  SELECT 
    a.symbol,
    a.amount,
    h.hour,
    COALESCE(
      (SELECT ph.price FROM price_history ph 
       WHERE ph.symbol = a.symbol 
       AND strftime('%Y-%m-%d %H', ph.recorded_at) = strftime('%Y-%m-%d %H', h.hour)
       ORDER BY ph.recorded_at DESC LIMIT 1),
      (SELECT ph.price FROM price_history ph 
       WHERE ph.symbol = a.symbol 
       AND ph.recorded_at <= h.hour || ':59:59'
       ORDER BY ph.recorded_at DESC LIMIT 1),
      a.amount * 0
    ) as price
  FROM active a CROSS JOIN hours h
)
SELECT 
  hour as recorded_at,
  ROUND(SUM(amount * price), 2) as portfolio_value,
  COUNT(CASE WHEN price > 0 THEN 1 END) as coin_count
FROM hourly_prices
WHERE price > 0
GROUP BY hour
HAVING coin_count >= (SELECT COUNT(*) FROM holdings WHERE status='active') * 0.5
ORDER BY hour ASC
")

# Current total value
TOTAL_VALUE=$(sqlite3 "$PORTFOLIO_DB" "SELECT ROUND(SUM(h.amount * h.current_price), 2) FROM holdings h WHERE h.status='active'")
TOTAL_INVESTED=$(sqlite3 "$PORTFOLIO_DB" "SELECT ROUND(SUM(h.amount * h.entry_price), 2) FROM holdings h WHERE h.status='active'")
PNL=$(python3 -c "v=${TOTAL_VALUE:-0}; i=${TOTAL_INVESTED:-0}; print(round(v-i,2))")
PNL_PCT=$(python3 -c "v=${TOTAL_VALUE:-0}; i=${TOTAL_INVESTED:-0}; print(round((v-i)/i*100,2) if i>0 else 0)")

# Export scanner coins
SCANNER_COINS=$(sqlite3 -json "$SCANNER_DB" "SELECT symbol, name, chain, narrative, market_cap, liquidity, volume_24h, score, result, reason, source, source_channels, scanned_at, updated_at FROM coins ORDER BY score DESC" 2>/dev/null || echo "[]")

# Export lessons
LESSONS=$(sqlite3 -json "$SCANNER_DB" "SELECT code, title, description, rule, created_at FROM lessons ORDER BY code" 2>/dev/null || echo "[]")

# Build JSON
cat > "$OUTPUT" << JSONEOF
{
  "exported_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "usdt_free": ${USDT_FREE:-0},
  "last_update": "${LAST_UPDATE}",
  "total_value": ${TOTAL_VALUE:-0},
  "total_invested": ${TOTAL_INVESTED:-0},
  "pnl": ${PNL:-0},
  "pnl_pct": ${PNL_PCT:-0},
  "holdings": ${HOLDINGS:-[]},
  "price_history": ${PRICE_HISTORY:-[]},
  "portfolio_history": ${PORTFOLIO_HISTORY:-[]},
  "scanner_coins": ${SCANNER_COINS:-[]},
  "lessons": ${LESSONS:-[]}
}
JSONEOF

echo "✅ Exported to $OUTPUT at $(date)"

# Git commit + push if in git repo
if [ -d "$SCRIPT_DIR/.git" ]; then
  cd "$SCRIPT_DIR"
  git add data.json
  git diff --cached --quiet || {
    git commit -m "📊 Data update $(date +%Y-%m-%d_%H:%M)"
    git push origin main 2>/dev/null || true
  }
fi
