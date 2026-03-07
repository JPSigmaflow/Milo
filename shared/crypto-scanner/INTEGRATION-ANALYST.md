# X-Scanner → ANALYST Integration

## 🎯 Ziel

X-Scanner findet Crypto-Mentions von 1,137 KOLs → ANALYST bewertet diese Coins

## 📊 Current Flow

### 1. X-Scanner Output
**File:** `data/x-scanner-output.json`

```json
{
  "scan_time": "2026-03-06T03:38:59Z",
  "new_mentions": 12,
  "results": [
    {
      "source": "x:lookonchain",
      "handle": "lookonchain",
      "text": "Whale bought 1M $BONK...",
      "time": "2026-03-06T03:37:26Z"
    }
  ]
}
```

### 2. Coin Extraction
Parse `results[]` für:
- Ticker symbols: `$BTC`, `$ETH`, `$BONK`
- Token addresses (0x...)
- Projekt-Namen

### 3. ANALYST Processing
Für jeden gefundenen Coin:
1. Metadata holen (CoinGecko, Coinpaprika, DexScreener)
2. 12-Kriterien Score berechnen
3. Bei Score ≥75 → Dual-Approval Workflow (Chris + Juri)

## 🔧 Integration Script (Concept)

```javascript
// analyst-kol-processor.mjs
import { readFileSync } from 'fs';

const scanOutput = JSON.parse(readFileSync('data/x-scanner-output.json', 'utf8'));

// Extract tickers
const tickers = new Set();
for (const mention of scanOutput.results) {
  const matches = mention.text.match(/\$([A-Z]{2,8})/g) || [];
  matches.forEach(m => tickers.add(m.replace('$', '')));
}

console.log(`Found ${tickers.size} unique tickers:`, [...tickers]);

// For each ticker:
// - Check if already in scanner.db or portfolio.db
// - If new → fetch metadata → score → maybe alert
```

## 📈 Recommended Workflow

### Option A: Lightweight (Current)
- X-Scanner runs 4x daily
- Output saved to `data/x-scanner-output.json`
- Human manually reviews output
- Triggers ANALYST for interesting coins

### Option B: Automated Pipeline
1. **X-Scanner** (every 6h) → finds mentions
2. **Ticker Extractor** → parses tickers from mentions
3. **ANALYST** → scores new tickers (auto-triggered if >5 mentions)
4. **Alert System** → notifies WEundMILO if Score ≥70

### Option C: Hybrid (Recommended)
- X-Scanner runs automatically
- Daily summary sent to Telegram (top 10 most-mentioned tickers)
- Chris/Juri can say "analyze $TICKER" → triggers ANALYST
- High-priority mentions (whale_alert, lookonchain) auto-trigger

## 🚨 High-Signal KOLs (Auto-Trigger)

These KOLs should auto-trigger ANALYST when they mention a coin:
- lookonchain (whale tracking)
- whale_alert (large transfers)
- EmberCN (Chinese whale tracker)
- ai_9684xtpa (AI on-chain analysis)
- ZachXBT (scam detection - reverse signal)

## 📝 Next Steps

1. Build ticker extraction script
2. Test with current `x-scanner-output.json`
3. Create daily summary Telegram message
4. Optional: Auto-trigger ANALYST for high-signal KOLs

---

**Status:** X-Scanner working, ready for ANALYST integration  
**Created:** 2026-03-05  
**Priority:** Medium (manual review working fine for now)
