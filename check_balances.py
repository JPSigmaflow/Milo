#!/usr/bin/env python3
import sys
sys.path.append('/Users/milo/.openclaw/workspace/skills/crypto-trader')
from scripts.mexc_trader import MexcTrader
import json

trader = MexcTrader()
account = trader.get_account_info()

print('💰 Non-zero Balances:')
for balance in account.get('balances', []):
    free_amount = float(balance['free'])
    locked_amount = float(balance['locked'])
    if free_amount > 0.001 or locked_amount > 0.001:
        print(f"{balance['asset']}: Free={free_amount:.4f}, Locked={locked_amount:.4f}")