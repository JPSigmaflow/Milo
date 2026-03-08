#!/usr/bin/env python3
"""Fetch 12-month monthly price history for all watchlist tickers via Yahoo Finance."""
import sqlite3, json, time, urllib.request, sys
from datetime import datetime, timedelta

DB = "/Users/milo/.openclaw/workspace/shared/stocks.db"

def fetch_yahoo(ticker, period1, period2):
    """Fetch monthly data from Yahoo Finance."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?period1={period1}&period2={period2}&interval=1mo"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        result = data["chart"]["result"][0]
        timestamps = result["timestamp"]
        quotes = result["indicators"]["quote"][0]
        rows = []
        for i, ts in enumerate(timestamps):
            dt = datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d")
            o = quotes["open"][i] if quotes["open"][i] else None
            h = quotes["high"][i] if quotes["high"][i] else None
            l = quotes["low"][i] if quotes["low"][i] else None
            c = quotes["close"][i] if quotes["close"][i] else None
            v = quotes["volume"][i] if quotes["volume"][i] else None
            if c is not None:
                rows.append((dt, o, h, l, c, v))
        return rows
    except Exception as e:
        print(f"  ❌ {ticker}: {e}")
        return []

def main():
    conn = sqlite3.connect(DB)
    tickers = [r[0] for r in conn.execute("SELECT DISTINCT ticker FROM watchlist WHERE ticker IS NOT NULL AND ticker != ''").fetchall()]
    
    now = int(datetime.now().timestamp())
    year_ago = int((datetime.now() - timedelta(days=365)).timestamp())
    
    total = 0
    for ticker in tickers:
        print(f"📊 {ticker}...", end=" ", flush=True)
        rows = fetch_yahoo(ticker, year_ago, now)
        if rows:
            for dt, o, h, l, c, v in rows:
                conn.execute(
                    "INSERT OR REPLACE INTO price_history (ticker, date, open, high, low, close, volume) VALUES (?,?,?,?,?,?,?)",
                    (ticker, dt, o, h, l, c, v)
                )
            conn.commit()
            total += len(rows)
            print(f"✅ {len(rows)} Monate")
        else:
            print("⚠️ keine Daten")
        time.sleep(0.5)  # Rate limiting
    
    print(f"\n✅ Fertig: {total} Datenpunkte für {len(tickers)} Ticker")
    conn.close()

if __name__ == "__main__":
    main()
