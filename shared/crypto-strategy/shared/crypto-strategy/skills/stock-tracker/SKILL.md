---
name: stock-tracker
description: Track stocks with real-time prices, watchlist, holdings, alerts, and automated reports. Use for ANY stock-related request in Alpha Stocks group.
---

# Stock Tracker Skill

## Overview
Automated stock tracking system with real-time Yahoo Finance data, alerts, and portfolio management.

## Database
- **Path:** `/shared/stocks.db`
- **Tables:** watchlist, holdings, price_history, alerts, transactions

## Scripts

### price-fetch.py
Fetch real-time stock prices from Yahoo Finance v8 API.
```bash
# Display quote
python3 scripts/price-fetch.py NOW

# Save to DB + check alerts
python3 scripts/price-fetch.py NOW --save --check-alerts

# JSON output
python3 scripts/price-fetch.py NOW --json
```

## Natural Language Interface
In the Alpha Stocks group (-5061534235), respond to:
- **"[TICKER] aufnehmen"** → Add to watchlist
- **"Kauf X [TICKER] @ [PRICE]"** → Add to holdings + transaction
- **"Verkauf [TICKER]"** → Remove from holdings + transaction
- **"Wie steht [TICKER]?"** → Live price quote
- **"Alert [TICKER] unter/über [PRICE]"** → Create price alert
- **"Report"** → Daily overview
- **"Watchlist"** → Show all watched stocks
- **"Portfolio"** → Show holdings with P&L

## Data Sources
- **Primary:** Yahoo Finance v8 Chart API (free, no key, real-time)
- **Manual Deep Dive:** Perplexity Finance (via browser, on request)

## Cron Jobs
- Hourly price check (9:30-16:00 EST market hours)
- Alert check on each price fetch
- Daily post-market report at 16:30 EST

## Alpha Stocks Group
- **Telegram ID:** -5061534235
- **Rule:** Stocks ONLY in this group
- **Language:** German
