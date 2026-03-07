#!/usr/bin/env python3
import sys
sys.path.append('/Users/milo/.openclaw/workspace/skills/crypto-trader')
from scripts.mexc_trader import MexcTrader
import json

def market_sell(trader, symbol, quantity):
    """Execute market sell order"""
    params = {
        'symbol': symbol,
        'side': 'SELL',
        'type': 'MARKET',
        'quantity': str(quantity)
    }
    
    return trader.api_request('/api/v3/order', params)

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 market_sell.py SYMBOL QUANTITY")
        sys.exit(1)
    
    symbol = sys.argv[1].upper()
    quantity = float(sys.argv[2])
    
    if not symbol.endswith('USDT'):
        symbol += 'USDT'
    
    trader = MexcTrader()
    
    print(f"🔴 Selling {quantity} {symbol}")
    
    try:
        result = market_sell(trader, symbol, quantity)
        print(f"📉 Sell result: {json.dumps(result, indent=2)}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    main()