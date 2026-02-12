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

# Export scanner coins
SCANNER_COINS=$(sqlite3 -json "$SCANNER_DB" "SELECT symbol, name, chain, narrative, market_cap, liquidity, volume_24h, score, result, reason, scanned_at FROM coins ORDER BY score DESC" 2>/dev/null || echo "[]")

# Export lessons
LESSONS=$(sqlite3 -json "$SCANNER_DB" "SELECT code, title, description, rule, created_at FROM lessons ORDER BY code" 2>/dev/null || echo "[]")

# Build JSON
cat > "$OUTPUT" << JSONEOF
{
  "exported_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "usdt_free": ${USDT_FREE:-0},
  "last_update": "${LAST_UPDATE}",
  "holdings": ${HOLDINGS:-[]},
  "price_history": ${PRICE_HISTORY:-[]},
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
