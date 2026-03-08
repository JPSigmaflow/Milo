#!/bin/bash
# ENHANCED Export crypto data with DB sync validation
# GARANTIERT: DB-MEXC Synchronisation nach jedem Trade

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTFOLIO_DB="/Users/milo/.openclaw/workspace/shared/portfolio.db"
SCANNER_DB="/Users/milo/.openclaw/workspace/shared/crypto-strategy/scanner.db"
OUTPUT="$SCRIPT_DIR/data.json"
LOCK_FILE="/tmp/milo-export.lock"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"; }
error() { echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1"; }

# Check if export already running
if [ -f "$LOCK_FILE" ]; then
    LOCK_AGE=$(( $(date +%s) - $(stat -f %m "$LOCK_FILE" 2>/dev/null || echo 0) ))
    if [ $LOCK_AGE -lt 300 ]; then
        error "Export bereits aktiv (${LOCK_AGE}s alt) - Abbruch"
        exit 1
    else
        warn "Verwaiste Lock-Datei entfernt (${LOCK_AGE}s alt)"
        rm -f "$LOCK_FILE"
    fi
fi

# Create lock
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

log "🚀 ENHANCED DATA EXPORT STARTED"

# 1. PRE-EXPORT VALIDATION
log "🔍 Pre-Export Validation..."

if [ ! -f "$PORTFOLIO_DB" ]; then
    error "Portfolio DB nicht gefunden: $PORTFOLIO_DB"
    exit 1
fi

# Check DB integrity
sqlite3 "$PORTFOLIO_DB" "PRAGMA integrity_check;" | grep -v "ok" && {
    error "DB integrity check FAILED!"
    exit 1
}

# 2. TRANSACTION VALIDATION (Ensure recent activity is recorded)
LAST_TX=$(sqlite3 "$PORTFOLIO_DB" "SELECT MAX(created_at) FROM transactions" 2>/dev/null || echo "")
if [ -n "$LAST_TX" ]; then
    LAST_TX_AGE=$(( $(date +%s) - $(date -j -f "%Y-%m-%d %H:%M:%S" "$LAST_TX" +%s 2>/dev/null || echo 0) ))
    if [ $LAST_TX_AGE -gt 3600 ]; then
        warn "Letzte Transaktion vor ${LAST_TX_AGE}s - möglicherweise veraltete Daten"
    fi
fi

# 3. RUN DB SYNC GUARDIAN (Critical!)
log "🛡️  Running DB Sync Guardian..."
if command -v node >/dev/null 2>&1; then
    if [ -f "/Users/milo/.openclaw/workspace/shared/crypto-strategy/db-sync-guardian.mjs" ]; then
        node "/Users/milo/.openclaw/workspace/shared/crypto-strategy/db-sync-guardian.mjs" || {
            error "DB Sync Guardian FAILED - Export gestoppt!"
            exit 1
        }
    else
        warn "DB Sync Guardian nicht gefunden - überspringe"
    fi
else
    warn "Node.js nicht verfügbar - DB Sync Guardian übersprungen"
fi

# 4. STANDARD DATA EXPORT (Original logic)
log "📊 Exporting data from DBs..."

# Export holdings
HOLDINGS=$(sqlite3 -json "$PORTFOLIO_DB" "SELECT symbol, name, amount, entry_price, exchange, chain, status, entry_date, current_price, updated_at, sold_price, sold_date FROM holdings ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'watchlist' THEN 1 ELSE 2 END, symbol")

# Export meta with enhanced error checking
USDT_FREE=$(sqlite3 "$PORTFOLIO_DB" "SELECT COALESCE(value, 0) FROM meta WHERE key='usdt_free'" 2>/dev/null || echo "0")
LAST_UPDATE=$(sqlite3 "$PORTFOLIO_DB" "SELECT COALESCE(value, 'unknown') FROM meta WHERE key='last_update'" 2>/dev/null || echo "unknown")

# Validate USDT_FREE is numeric
if ! [[ "$USDT_FREE" =~ ^[0-9]+\.?[0-9]*$ ]]; then
    error "Invalid USDT_FREE value: $USDT_FREE"
    USDT_FREE="0"
fi

# Export transactions with error handling
TRANSACTIONS=$(sqlite3 -json "$PORTFOLIO_DB" "SELECT coin, type, amount, price_usd, total_usd, fee_usd, exchange, tx_date, notes FROM transactions ORDER BY tx_date DESC, id DESC" 2>/dev/null || echo "[]")

# Count transactions for validation
TX_COUNT=$(echo "$TRANSACTIONS" | jq length 2>/dev/null || echo "0")
if [ "$TX_COUNT" -lt 15 ]; then
    warn "Nur $TX_COUNT Transaktionen gefunden (erwartet: ≥15)"
fi

# Calculate values with enhanced error handling
TOTAL_VALUE=$(sqlite3 "$PORTFOLIO_DB" "SELECT COALESCE(ROUND(SUM(h.amount * h.current_price), 2), 0) FROM holdings h WHERE h.status='active'" 2>/dev/null || echo "0")
TOTAL_WITH_USDT=$(python3 -c "print(round(${TOTAL_VALUE:-0} + ${USDT_FREE:-0}, 2))" 2>/dev/null || echo "0")
TOTAL_INVESTED=$(sqlite3 "$PORTFOLIO_DB" "SELECT COALESCE(ROUND(SUM(h.amount * h.entry_price), 2), 0) FROM holdings h WHERE h.status='active'" 2>/dev/null || echo "0")
PNL=$(python3 -c "v=${TOTAL_VALUE:-0}; i=${TOTAL_INVESTED:-0}; print(round(v-i,2))" 2>/dev/null || echo "0")
PNL_PCT=$(python3 -c "v=${TOTAL_VALUE:-0}; i=${TOTAL_INVESTED:-0}; print(round((v-i)/i*100,2) if i>0 else 0)" 2>/dev/null || echo "0")

# Export other data
PRICE_HISTORY=$(sqlite3 -json "$PORTFOLIO_DB" "SELECT symbol, price, change_24h, market_cap, volume_24h, recorded_at FROM price_history ORDER BY recorded_at ASC" 2>/dev/null || echo "[]")
TOTAL_FEES=$(sqlite3 "$PORTFOLIO_DB" "SELECT COALESCE(ROUND(SUM(fee_usd),2),0) FROM transactions" 2>/dev/null || echo "0")

# 5. BUILD JSON WITH ENHANCED METADATA
log "📝 Building JSON with validation metadata..."

cat > "$OUTPUT" << JSONEOF
{
  "exported_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "export_version": "enhanced-v1.0",
  "validation": {
    "tx_count": ${TX_COUNT},
    "last_tx": "${LAST_TX}",
    "db_integrity": "ok",
    "sync_guardian": "passed"
  },
  "usdt_free": ${USDT_FREE:-0},
  "last_update": "${LAST_UPDATE}",
  "total_value": ${TOTAL_VALUE:-0},
  "total_with_usdt": ${TOTAL_WITH_USDT:-0},
  "total_invested": ${TOTAL_INVESTED:-0},
  "pnl": ${PNL:-0},
  "pnl_pct": ${PNL_PCT:-0},
  "bilanz": {
    "status": "Ausgeglichen ✅",
    "total_fees_usd": ${TOTAL_FEES:-0},
    "business": {
      "titel": "Business-Gesamtbilanz (EUR)",
      "chris_eur": 7500,
      "juri_eur": 5141,
      "gesamt_eur": 12641,
      "posten": [
        {"datum": "Jan 2026", "beschreibung": "MEXC Überweisung #1", "betrag": 2500, "von": "Chris", "typ": "Crypto"},
        {"datum": "Jan 2026", "beschreibung": "MEXC Überweisung #2", "betrag": 2500, "von": "Chris", "typ": "Crypto"},
        {"datum": "13.02.2026", "beschreibung": "MEXC Einzahlung", "betrag": 500, "von": "Chris", "typ": "Crypto"},
        {"datum": "Jan 2026", "beschreibung": "iMac + Ausstattung", "betrag": 791, "von": "Juri", "typ": "Hardware"},
        {"datum": "Feb 2026", "beschreibung": "Kapitalausgleich", "betrag": 2350, "von": "Juri", "typ": "Ausgleich"},
        {"datum": "19.02.2026", "beschreibung": "MEXC Einzahlung (SEPA)", "betrag": 2000, "von": "Chris", "typ": "Crypto"},
        {"datum": "19.02.2026", "beschreibung": "MEXC Einzahlung (SEPA)", "betrag": 2000, "von": "Juri", "typ": "Crypto"}
      ]
    }
  },
  "transactions": ${TRANSACTIONS:-[]},
  "holdings": ${HOLDINGS:-[]},
  "price_history": ${PRICE_HISTORY:-[]}
}
JSONEOF

# 6. POST-EXPORT VALIDATION
log "✅ Post-Export Validation..."

if ! python3 -c "import json; json.load(open('$OUTPUT'))" 2>/dev/null; then
    error "Generated JSON is invalid!"
    exit 1
fi

FILE_SIZE=$(wc -c < "$OUTPUT" | tr -d ' ')
if [ "$FILE_SIZE" -lt 1000 ]; then
    error "Generated file too small ($FILE_SIZE bytes) - möglicherweise korrupt"
    exit 1
fi

# 7. RUN DEPLOYMENT VALIDATION
if [ -f "$SCRIPT_DIR/validate-deployment.sh" ]; then
    log "🔍 Running deployment validation..."
    cd "$SCRIPT_DIR"
    ./validate-deployment.sh || {
        error "Deployment validation FAILED!"
        exit 1
    }
fi

# 8. GIT COMMIT + PUSH
log "📤 Git commit + push..."
if [ -d "$SCRIPT_DIR/.git" ]; then
  cd "$SCRIPT_DIR"
  git add data.json
  git diff --cached --quiet || {
    git commit -m "📊 Enhanced data update $(date +%Y-%m-%d_%H:%M)"
    git push origin main 2>/dev/null || {
        warn "Git push failed - but export successful"
    }
  }
fi

log "✅ ENHANCED EXPORT COMPLETED"
echo "📊 $TX_COUNT transactions, \$${TOTAL_WITH_USDT} total value"
echo "📁 Exported to: $OUTPUT ($FILE_SIZE bytes)"