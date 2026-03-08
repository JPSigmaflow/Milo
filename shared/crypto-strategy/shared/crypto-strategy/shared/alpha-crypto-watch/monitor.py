#!/usr/bin/env python3
"""
Alpha Crypto Watch — SQLite DB + Live Price Checks + Alerts
Checks all active watchlist coins and sends alerts to WEundMILO when thresholds hit.
"""

import sqlite3
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

DB_PATH = Path("/Users/milo/.openclaw/workspace/shared/alpha-crypto-watch/alpha-crypto-watch.db")
PORTFOLIO_DB = Path("/Users/milo/.openclaw/workspace/shared/portfolio.db")

def get_coinpaprika_price(coin_id):
    """Fetch price data from Coinpaprika"""
    try:
        result = subprocess.run(
            ['curl', '-s', f'https://api.coinpaprika.com/v1/tickers/{coin_id}?quotes=USD'],
            capture_output=True, text=True, timeout=15
        )
        data = json.loads(result.stdout)
        quotes = data.get('quotes', {}).get('USD', {})
        return {
            'price': quotes.get('price', 0),
            'change_24h': quotes.get('percent_change_24h', 0),
            'volume_24h': quotes.get('volume_24h', 0),
            'market_cap': quotes.get('market_cap', 0)
        }
    except Exception as e:
        print(f"  ⚠️ Coinpaprika error for {coin_id}: {e}")
        return None

def get_dexscreener_price(pair_address):
    """Fetch price data from DexScreener"""
    try:
        result = subprocess.run(
            ['curl', '-s', f'https://api.dexscreener.com/latest/dex/pairs/solana/{pair_address}'],
            capture_output=True, text=True, timeout=15
        )
        data = json.loads(result.stdout)
        pair = data.get('pair') or (data.get('pairs', [None]) or [None])[0]
        if not pair:
            # Try search
            result = subprocess.run(
                ['curl', '-s', f'https://api.dexscreener.com/latest/dex/search?q={pair_address}'],
                capture_output=True, text=True, timeout=15
            )
            data = json.loads(result.stdout)
            pairs = data.get('pairs', [])
            pair = pairs[0] if pairs else None
        
        if not pair:
            return None
            
        return {
            'price': float(pair.get('priceUsd', 0)),
            'change_24h': float(pair.get('priceChange', {}).get('h24', 0)),
            'volume_24h': float(pair.get('volume', {}).get('h24', 0)),
            'market_cap': float(pair.get('marketCap', 0) or pair.get('fdv', 0))
        }
    except Exception as e:
        print(f"  ⚠️ DexScreener error for {pair_address}: {e}")
        return None

def check_mexc_listing(symbol):
    """Check if a symbol is listed on MEXC"""
    try:
        result = subprocess.run(
            ['curl', '-s', f'https://api.mexc.com/api/v3/ticker/price?symbol={symbol}USDT'],
            capture_output=True, text=True, timeout=10
        )
        data = json.loads(result.stdout)
        return 'price' in data and 'code' not in data
    except:
        return False

def check_alerts(coin, data):
    """Check if any alert thresholds are triggered"""
    alerts = []
    
    if coin['alert_price_above'] and data['price'] >= coin['alert_price_above']:
        alerts.append(('PRICE_ABOVE', f"🚨 {coin['symbol']} über ${coin['alert_price_above']}! Aktuell: ${data['price']:.6f}"))
    
    if coin['alert_price_below'] and data['price'] <= coin['alert_price_below']:
        alerts.append(('PRICE_BELOW', f"🚨 {coin['symbol']} unter ${coin['alert_price_below']}! Aktuell: ${data['price']:.6f}"))
    
    if coin['alert_change_24h_above'] and data['change_24h'] >= coin['alert_change_24h_above']:
        sold_info = f" | Verkauf war: ${coin['sold_price']:.5f}" if coin.get('sold_price') else ""
        alerts.append(('CHANGE_24H', f"⚡ {coin['symbol']} +{data['change_24h']:.1f}% steigend! Aktuell: ${data['price']:.6f}{sold_info}"))
    
    # Check vs last saved price (short-term movement)
    if coin.get('current_price') and coin['current_price'] > 0 and coin['alert_change_24h_above']:
        change_since_last = ((data['price'] - coin['current_price']) / coin['current_price']) * 100
        if change_since_last >= coin['alert_change_24h_above']:
            sold_info = f" | Verkauf war: ${coin['sold_price']:.5f}" if coin.get('sold_price') else ""
            alerts.append(('SHORT_TERM_UP', f"📈 {coin['symbol']} +{change_since_last:.1f}% seit letztem Check! Aktuell: ${data['price']:.6f}{sold_info}"))
    
    if coin['alert_change_24h_below'] and data['change_24h'] <= coin['alert_change_24h_below']:
        alerts.append(('CHANGE_24H_DROP', f"📉 {coin['symbol']} {data['change_24h']:.1f}% in 24h! Preis: ${data['price']:.6f}"))
    
    if coin['alert_volume_above'] and data['volume_24h'] >= coin['alert_volume_above']:
        alerts.append(('VOLUME', f"📊 {coin['symbol']} Volume ${data['volume_24h']:,.0f} über Schwelle ${coin['alert_volume_above']:,.0f}!"))
    
    if coin['alert_mc_above'] and data['market_cap'] >= coin['alert_mc_above']:
        alerts.append(('MC_BREAKOUT', f"📈 {coin['symbol']} MC ${data['market_cap']:,.0f} über ${coin['alert_mc_above']:,.0f}!"))
    
    if coin['alert_mexc_listing']:
        if check_mexc_listing(coin['symbol']):
            alerts.append(('MEXC_LISTING', f"🚨🚨 {coin['symbol']} auf MEXC gelistet!!!"))
    
    return alerts

def log_alert(db, symbol, alert_type, message, price):
    """Log alert to history and avoid duplicate spam"""
    # Check if same alert was sent in last 4 hours
    cursor = db.execute("""
        SELECT COUNT(*) FROM alert_history 
        WHERE symbol = ? AND alert_type = ? 
        AND sent_at > datetime('now', '-4 hours')
    """, (symbol, alert_type))
    
    if cursor.fetchone()[0] > 0:
        return False  # Already alerted recently
    
    db.execute("""
        INSERT INTO alert_history (symbol, alert_type, message, price_at_alert)
        VALUES (?, ?, ?, ?)
    """, (symbol, alert_type, message, price))
    db.commit()
    return True

def format_summary(coins_data):
    """Format daily summary"""
    lines = ["🎯 **Alpha Watch Status:**"]
    for symbol, data in coins_data.items():
        if data:
            change = f"+{data['change_24h']:.1f}%" if data['change_24h'] >= 0 else f"{data['change_24h']:.1f}%"
            lines.append(f"• {symbol}: ${data['price']:.6f} ({change}) | MC ${data['market_cap']:,.0f}")
    return "\n".join(lines)

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'check'
    
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    
    coins = db.execute("SELECT * FROM watchlist WHERE status = 'active'").fetchall()
    
    if not coins:
        print("No active coins in watchlist.")
        return
    
    print(f"🔍 Checking {len(coins)} active coins...")
    
    alerts_to_send = []
    coins_data = {}
    
    for coin in coins:
        coin = dict(coin)
        symbol = coin['symbol']
        print(f"\n📡 {symbol}...")
        
        # Fetch price based on data source
        if coin['data_source'] == 'coinpaprika':
            data = get_coinpaprika_price(coin['data_id'])
        elif coin['data_source'] == 'dexscreener':
            data = get_dexscreener_price(coin['data_id'])
        else:
            print(f"  ⚠️ Unknown data source: {coin['data_source']}")
            continue
        
        if not data:
            print(f"  ❌ No data for {symbol}")
            continue
        
        coins_data[symbol] = data
        print(f"  💰 ${data['price']:.6f} | 24h: {data['change_24h']:.1f}% | Vol: ${data['volume_24h']:,.0f} | MC: ${data['market_cap']:,.0f}")
        
        # Update DB with current data
        db.execute("""
            UPDATE watchlist SET 
                current_price = ?, current_mc = ?, current_volume = ?,
                current_change_24h = ?, last_checked_at = datetime('now')
            WHERE symbol = ?
        """, (data['price'], data['market_cap'], data['volume_24h'], data['change_24h'], symbol))
        db.commit()
        
        # Check alerts
        triggered = check_alerts(coin, data)
        for alert_type, message in triggered:
            if log_alert(db, symbol, alert_type, message, data['price']):
                alerts_to_send.append(message)
                print(f"  🚨 ALERT: {message}")
            else:
                print(f"  ℹ️ Alert suppressed (already sent recently): {alert_type}")
    
    # Output
    if mode == 'summary':
        summary = format_summary(coins_data)
        print(f"\n{summary}")
        # Write summary to stdout for cron to pick up
        with open('/tmp/alpha-watch-summary.txt', 'w') as f:
            f.write(summary)
    
    if alerts_to_send:
        alert_text = "🎯 **Alpha Watch Alerts:**\n\n" + "\n".join(alerts_to_send)
        print(f"\n📨 Sending {len(alerts_to_send)} alert(s)...")
        with open('/tmp/alpha-watch-alerts.txt', 'w') as f:
            f.write(alert_text)
    else:
        print("\n✅ Keine Alerts — alle unter Schwelle.")
    
    # Always write current state for cron
    state = {symbol: data for symbol, data in coins_data.items() if data}
    with open('/tmp/alpha-watch-state.json', 'w') as f:
        json.dump(state, f, indent=2)
    
    db.close()

if __name__ == '__main__':
    main()
