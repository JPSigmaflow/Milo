#!/usr/bin/env python3
"""Fetch real-time stock prices from Yahoo Finance v8 API."""

import json
import sys
import urllib.request
import sqlite3
from datetime import datetime

DB_PATH = "/Users/milo/.openclaw/workspace/shared/stocks.db"
BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart"

def fetch_quote(ticker: str) -> dict:
    """Fetch current quote for a ticker."""
    url = f"{BASE_URL}/{ticker}?interval=1d&range=5d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read())
    
    meta = data["chart"]["result"][0]["meta"]
    indicators = data["chart"]["result"][0]["indicators"]["quote"][0]
    timestamps = data["chart"]["result"][0].get("timestamp", [])
    
    return {
        "ticker": ticker.upper(),
        "price": meta.get("regularMarketPrice"),
        "day_high": meta.get("regularMarketDayHigh"),
        "day_low": meta.get("regularMarketDayLow"),
        "volume": meta.get("regularMarketVolume"),
        "prev_close": meta.get("chartPreviousClose"),
        "52w_high": meta.get("fiftyTwoWeekHigh"),
        "52w_low": meta.get("fiftyTwoWeekLow"),
        "name": meta.get("longName", meta.get("shortName", ticker)),
        "currency": meta.get("currency", "USD"),
        "exchange": meta.get("fullExchangeName", ""),
        "timestamps": timestamps,
        "closes": indicators.get("close", []),
        "opens": indicators.get("open", []),
        "highs": indicators.get("high", []),
        "lows": indicators.get("low", []),
        "volumes": indicators.get("volume", []),
    }

def save_price(ticker: str, quote: dict):
    """Save today's price to price_history."""
    conn = sqlite3.connect(DB_PATH)
    today = datetime.now().strftime("%Y-%m-%d")
    conn.execute(
        "INSERT OR REPLACE INTO price_history (ticker, date, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (ticker.upper(), today, quote.get("opens", [None])[-1], quote["day_high"], quote["day_low"], quote["price"], quote["volume"])
    )
    conn.commit()
    conn.close()

def check_alerts(ticker: str, price: float) -> list:
    """Check if any alerts triggered for this ticker."""
    conn = sqlite3.connect(DB_PATH)
    triggered = []
    alerts = conn.execute(
        "SELECT id, condition, target_price, notes FROM alerts WHERE ticker = ? AND triggered = 0",
        (ticker.upper(),)
    ).fetchall()
    
    for alert_id, condition, target, notes in alerts:
        fire = False
        if condition == "below" and price <= target:
            fire = True
        elif condition == "above" and price >= target:
            fire = True
        
        if fire:
            conn.execute(
                "UPDATE alerts SET triggered = 1, triggered_at = ? WHERE id = ?",
                (datetime.now().isoformat(), alert_id)
            )
            triggered.append({
                "id": alert_id,
                "condition": condition,
                "target": target,
                "notes": notes,
                "current_price": price
            })
    
    conn.commit()
    conn.close()
    return triggered

def format_quote(quote: dict) -> str:
    """Format quote for display."""
    price = quote["price"]
    prev = quote["prev_close"]
    change = price - prev if prev else 0
    pct = (change / prev * 100) if prev else 0
    arrow = "📈" if change >= 0 else "📉"
    sign = "+" if change >= 0 else ""
    
    return (
        f"{arrow} {quote['name']} ({quote['ticker']})\n"
        f"💰 ${price:.2f} ({sign}{change:.2f} / {sign}{pct:.2f}%)\n"
        f"📊 Range: ${quote['day_low']:.2f} - ${quote['day_high']:.2f}\n"
        f"📦 Volume: {quote['volume']:,.0f}\n"
        f"📅 52W: ${quote['52w_low']:.2f} - ${quote['52w_high']:.2f}"
    )

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: price-fetch.py <TICKER> [--save] [--check-alerts] [--json]")
        sys.exit(1)
    
    ticker = sys.argv[1].upper()
    save = "--save" in sys.argv
    check = "--check-alerts" in sys.argv
    as_json = "--json" in sys.argv
    
    quote = fetch_quote(ticker)
    
    if save:
        save_price(ticker, quote)
    
    if as_json:
        print(json.dumps(quote, default=str))
    else:
        print(format_quote(quote))
    
    if check:
        triggered = check_alerts(ticker, quote["price"])
        for alert in triggered:
            print(f"\n🚨 ALERT: {ticker} {alert['condition']} ${alert['target']:.2f} → Current: ${alert['current_price']:.2f}")
