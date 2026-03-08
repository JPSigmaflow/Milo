#!/usr/bin/env python3
"""Price check for rejected stocks only. Fetches prices, updates DB, checks +10% alerts."""
import sqlite3, json, urllib.request, sys
from datetime import datetime

DB = "/Users/milo/.openclaw/workspace/shared/stocks.db"

def fetch_price(ticker):
    """Fetch current price from Yahoo Finance."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        result = data["chart"]["result"][0]
        price = result["meta"]["regularMarketPrice"]
        return round(price, 2)
    except Exception as e:
        print(f"  ERR {ticker}: {e}")
        return None

def main():
    conn = sqlite3.connect(DB)
    rows = conn.execute("""
        SELECT ticker, company, alert_base_price, alert_threshold, alert_triggered 
        FROM rejected WHERE ticker IS NOT NULL
    """).fetchall()
    
    if not rows:
        print("NO_REJECTED")
        conn.close()
        return
    
    today = datetime.now().strftime("%Y-%m-%d")
    alerts = []
    
    for ticker, company, base_price, threshold, triggered in rows:
        price = fetch_price(ticker)
        if price is None:
            continue
        
        # Update last_price
        conn.execute("UPDATE rejected SET last_price = ?, last_price_date = ? WHERE ticker = ?", 
                     (price, today, ticker))
        
        # Insert into price_history
        conn.execute("""
            INSERT OR REPLACE INTO price_history (ticker, date, close) 
            VALUES (?, ?, ?)
        """, (ticker, today, price))
        
        # Check alert
        thr = threshold or 10.0
        if base_price and base_price > 0 and not triggered:
            change = ((price - base_price) / base_price) * 100
            if change >= thr:
                alerts.append({
                    "ticker": ticker,
                    "company": company,
                    "base": base_price,
                    "current": price,
                    "change": round(change, 1)
                })
                conn.execute("UPDATE rejected SET alert_triggered = 1 WHERE ticker = ?", (ticker,))
                print(f"ALERT:{ticker}|{company}|+{round(change,1)}%|${base_price:.2f}→${price:.2f}")
            else:
                print(f"OK:{ticker}|${price}|{change:+.1f}%")
        else:
            print(f"OK:{ticker}|${price}")
    
    conn.commit()
    conn.close()
    
    if not alerts:
        print("NO_ALERTS")

if __name__ == "__main__":
    main()
