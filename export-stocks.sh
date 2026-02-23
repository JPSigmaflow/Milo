#!/bin/bash
STOCKS_DB="/Users/milo/.openclaw/workspace/shared/stocks.db"
OUTPUT="/Users/milo/.openclaw/workspace/shared/crypto-dashboard/stocks-data.json"

# Watchlist mit allen Feldern
WATCHLIST=$(sqlite3 -json "$STOCKS_DB" "SELECT ticker, company, sector, country, status, market_cap, last_price, last_price_date, score as research_score, overall_score, overall_reasoning, category, thesis, risk_factors, catalyst, research_source, research_date, perplexity_url FROM watchlist WHERE ticker IS NOT NULL AND ticker != '' ORDER BY overall_score DESC")

# Holdings
HOLDINGS=$(sqlite3 -json "$STOCKS_DB" "SELECT * FROM holdings ORDER BY overall_score DESC")

# Recent insights (letzte 7 Tage)
INSIGHTS=$(sqlite3 -json "$STOCKS_DB" "SELECT ticker, date, source, category, headline, summary FROM insights WHERE date >= datetime('now', '-7 days') ORDER BY date DESC")

# Score history
SCORES=$(sqlite3 -json "$STOCKS_DB" "SELECT ticker, date, overall_score, reasoning, components FROM score_history ORDER BY date DESC")

# Price history (letzte 5 Tage)
PRICES=$(sqlite3 -json "$STOCKS_DB" "SELECT ticker, date, open, high, low, close, volume FROM price_history ORDER BY date DESC")

# Stats
WATCHLIST_COUNT=$(sqlite3 "$STOCKS_DB" "SELECT COUNT(*) FROM watchlist WHERE ticker IS NOT NULL")
HOLDINGS_COUNT=$(sqlite3 "$STOCKS_DB" "SELECT COUNT(*) FROM holdings")
INSIGHTS_COUNT=$(sqlite3 "$STOCKS_DB" "SELECT COUNT(*) FROM insights WHERE date >= datetime('now', '-24 hours')")
AVG_SCORE=$(sqlite3 "$STOCKS_DB" "SELECT ROUND(AVG(overall_score),1) FROM watchlist WHERE overall_score IS NOT NULL")

cat > "$OUTPUT" << JSONEOF
{
  "exported_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "stats": {
    "watchlist_count": ${WATCHLIST_COUNT:-0},
    "holdings_count": ${HOLDINGS_COUNT:-0},
    "insights_today": ${INSIGHTS_COUNT:-0},
    "avg_overall_score": ${AVG_SCORE:-0}
  },
  "watchlist": ${WATCHLIST:-[]},
  "holdings": ${HOLDINGS:-[]},
  "insights": ${INSIGHTS:-[]},
  "score_history": ${SCORES:-[]},
  "price_history": ${PRICES:-[]}
}
JSONEOF
echo "✅ Stocks data exported"
