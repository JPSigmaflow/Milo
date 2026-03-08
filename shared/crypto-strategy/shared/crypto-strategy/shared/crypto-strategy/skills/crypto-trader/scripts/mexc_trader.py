#!/usr/bin/env python3
"""
MEXC Trading Script with Dual-Approval Workflow
Requires approval from both Chris (7590333825) and Juri (6162586520)
"""

import sys
import json
import time
import hmac
import hashlib
import subprocess
import sqlite3
import os
from datetime import datetime
from pathlib import Path

# Configuration
WORKSPACE = Path("/Users/milo/.openclaw/workspace")
API_KEYS_FILE = WORKSPACE / "private/mexc-api.json"
PORTFOLIO_DB = WORKSPACE / "shared/portfolio.db"
CRYPTO_DASHBOARD = WORKSPACE / "shared/crypto-dashboard"

# Telegram IDs for dual approval
CHRIS_ID = "7590333825"
JURI_ID = "6162586520"

class MexcTrader:
    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        self.api_key = None
        self.api_secret = None
        self.base_url = "https://api.mexc.com"
        self.load_credentials()
    
    def load_credentials(self):
        """Load API credentials from secure file"""
        try:
            with open(API_KEYS_FILE, 'r') as f:
                creds = json.load(f)
                self.api_key = creds['access_key']
                self.api_secret = creds['secret_key']
                
                # Check expiration
                if 'expires' in creds:
                    print(f"⏰ API Keys expire: {creds['expires']}")
        except FileNotFoundError:
            raise Exception(f"❌ API credentials not found: {API_KEYS_FILE}")
        except json.JSONDecodeError:
            raise Exception("❌ Invalid JSON in credentials file")
    
    def sign_request(self, query_string):
        """Create HMAC signature for API request"""
        return hmac.new(
            self.api_secret.encode('utf-8'), 
            query_string.encode('utf-8'), 
            hashlib.sha256
        ).hexdigest()
    
    def api_request(self, endpoint, params=None, method='POST'):
        """Make authenticated API request using curl"""
        if params is None:
            params = {}
            
        timestamp = int(time.time() * 1000)
        params['timestamp'] = timestamp
        
        query_string = '&'.join([f'{k}={v}' for k, v in params.items()])
        signature = self.sign_request(query_string)
        
        if method == 'GET':
            # For GET requests, append params to URL
            url = f'{self.base_url}{endpoint}?{query_string}&signature={signature}'
            curl_cmd = [
                'curl', '-s', '-X', 'GET', url,
                '-H', f'X-MEXC-APIKEY: {self.api_key}'
            ]
        else:
            # For POST requests, use JSON format
            data_string = f'{query_string}&signature={signature}'
            curl_cmd = [
                'curl', '-s', '-X', 'POST',
                f'{self.base_url}{endpoint}',
                '-H', f'X-MEXC-APIKEY: {self.api_key}',
                '-H', 'Content-Type: application/json',
                '-d', data_string
            ]
        
        if self.dry_run:
            print(f"🧪 DRY RUN - Would execute: {' '.join(curl_cmd)}")
            if endpoint == '/api/v3/account':
                return {"balances": [{"asset": "USDT", "free": "4509.76", "locked": "0"}]}
            return {"orderId": "DRY_RUN_12345", "status": "FILLED"}
            
        result = subprocess.run(curl_cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise Exception(f"❌ API request failed: {result.stderr}")
            
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            raise Exception(f"❌ Invalid API response: {result.stdout}")
    
    def get_account_info(self):
        """Get account balance and info"""
        return self.api_request('/api/v3/account', method='GET')
    
    def get_usdt_balance(self):
        """Get available USDT balance"""
        account = self.get_account_info()
        for balance in account.get('balances', []):
            if balance['asset'] == 'USDT':
                return float(balance['free'])
        return 0.0
    
    def market_buy(self, symbol, quote_amount):
        """Execute market buy order"""
        params = {
            'symbol': symbol,
            'side': 'BUY',
            'type': 'MARKET',
            'quoteOrderQty': str(quote_amount)
        }
        
        return self.api_request('/api/v3/order', params)
    
    def validate_trade(self, symbol, amount):
        """Validate trade parameters"""
        errors = []
        
        # Check USDT balance
        try:
            balance = self.get_usdt_balance()
            if balance < amount:
                errors.append(f"❌ Insufficient balance: ${balance:.2f} < ${amount}")
        except Exception as e:
            errors.append(f"❌ Could not check balance: {e}")
        
        # Check symbol format
        if not symbol.upper().endswith('USDT'):
            errors.append(f"❌ Symbol must end with USDT: {symbol}")
        
        # Check amount
        if amount <= 0:
            errors.append(f"❌ Amount must be positive: {amount}")
            
        return errors
    
    def update_database(self, symbol, amount, filled_qty, avg_price):
        """Update portfolio database after successful trade"""
        if self.dry_run:
            print(f"🧪 DRY RUN - Would update DB: {symbol}, qty={filled_qty}, price={avg_price}")
            return
            
        try:
            conn = sqlite3.connect(PORTFOLIO_DB)
            cursor = conn.cursor()
            
            # Get coin info from watchlist or create new entry
            base_symbol = symbol.replace('USDT', '')
            
            # Insert or update holdings
            cursor.execute('''
                INSERT OR REPLACE INTO holdings 
                (symbol, name, amount, entry_price, exchange, chain, contract_address, coinpaprika_id, status, entry_date, updated_at)
                VALUES (?, ?, ?, ?, 'MEXC', 'BSC', '', ?, 'active', date('now'), datetime('now'))
            ''', (base_symbol, base_symbol, filled_qty, avg_price, f"{base_symbol.lower()}-{base_symbol.lower()}"))
            
            # Add transaction record
            cursor.execute('''
                INSERT INTO transactions 
                (symbol, type, amount, price, total_usd, exchange, tx_date, created_at)
                VALUES (?, 'BUY', ?, ?, ?, 'MEXC', datetime('now'), datetime('now'))
            ''', (base_symbol, filled_qty, avg_price, amount))
            
            conn.commit()
            conn.close()
            
            print(f"✅ Database updated: {base_symbol}")
            
            # Update dashboard
            self.update_dashboard()
            
        except Exception as e:
            print(f"⚠️ Database update failed: {e}")
    
    def update_dashboard(self):
        """Run export-data.sh to update dashboard"""
        if self.dry_run:
            print("🧪 DRY RUN - Would update dashboard")
            return
            
        try:
            os.chdir(CRYPTO_DASHBOARD)
            result = subprocess.run(['./export-data.sh'], capture_output=True, text=True)
            if result.returncode == 0:
                print("✅ Dashboard updated")
            else:
                print(f"⚠️ Dashboard update failed: {result.stderr}")
        except Exception as e:
            print(f"⚠️ Dashboard update error: {e}")

def send_button_approval(symbol, amount, current_price, market_cap):
    """Send button-based approval request to Telegram group"""
    import subprocess
    
    coin = symbol.replace('USDT', '')
    est_quantity = amount / current_price
    
    message = f"""🔔 **TRADE APPROVAL NEEDED**

**Coin:** {coin}
**Amount:** ${amount:,.2f}
**Price:** ${current_price:.4f}
**Market Cap:** ${market_cap:,.0f}
**Estimated Quantity:** ~{est_quantity:,.0f} coins

🛡️ **DUAL APPROVAL REQUIRED**
Both buttons must be clicked to proceed!"""

    # Send message with inline buttons to WEundMILO group
    try:
        result = subprocess.run([
            'openclaw', 'message', 'send',
            '--target', 'WEundMILO',
            '--message', message,
            '--buttons', f'[[{{"text":"✅ CHRIS","callback_data":"APPROVE_{coin}_CHRIS"}},{{"text":"✅ JURI","callback_data":"APPROVE_{coin}_JURI"}},{{"text":"❌ REJECT","callback_data":"REJECT_{coin}"}}]]'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Button approval sent for {coin}")
            return True
        else:
            print(f"❌ Failed to send approval: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error sending approval: {e}")
        return False

def check_button_approvals(symbol):
    """Check if both Chris and Juri have clicked approval buttons"""
    # This would check a database/file for button click records
    # For now, return False to force manual approval checking
    coin = symbol.replace('USDT', '')
    
    approval_file = WORKSPACE / f"private/approvals_{coin}.json"
    
    if not approval_file.exists():
        print(f"❌ No approval file found for {coin}")
        return False, False
    
    try:
        with open(approval_file, 'r') as f:
            approvals = json.load(f)
        
        chris_approved = approvals.get('chris', False)
        juri_approved = approvals.get('juri', False)
        
        print(f"📊 Approval Status {coin}: Chris={chris_approved}, Juri={juri_approved}")
        
        return chris_approved, juri_approved
    except Exception as e:
        print(f"❌ Error reading approvals: {e}")
        return False, False

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 mexc_trader.py buy SYMBOL AMOUNT [--dry-run]")
        print("  python3 mexc_trader.py balance")
        print("  python3 mexc_trader.py request_approval SYMBOL AMOUNT")
        print("  python3 mexc_trader.py check_approval SYMBOL") 
        print("  python3 mexc_trader.py validate_market_cap SYMBOL")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    dry_run = '--dry-run' in sys.argv
    
    if dry_run:
        print("🧪 DRY RUN MODE - No actual trades will be executed")
    
    trader = MexcTrader(dry_run=dry_run)
    
    try:
        if command == 'balance':
            balance = trader.get_usdt_balance()
            print(f"💰 USDT Balance: ${balance:,.2f}")
            
        elif command == 'buy':
            if len(sys.argv) < 4:
                print("❌ Usage: buy SYMBOL AMOUNT")
                sys.exit(1)
                
            symbol = sys.argv[2].upper()
            amount = float(sys.argv[3])
            
            if not symbol.endswith('USDT'):
                symbol += 'USDT'
            
            # Validate trade
            errors = trader.validate_trade(symbol, amount)
            if errors:
                print("❌ Trade validation failed:")
                for error in errors:
                    print(f"  {error}")
                sys.exit(1)
            
            print(f"✅ Trade validation passed")
            print(f"🎯 Trade: {symbol} for ${amount}")
            
            # Check for button-based dual approval (always, even in dry-run)
            chris_approved, juri_approved = check_button_approvals(symbol)
            
            if not (chris_approved and juri_approved):
                print("🛡️ DUAL APPROVAL REQUIRED")
                print("🔘 Checking for button approvals...")
                
                if not chris_approved and not juri_approved:
                    print("❌ Neither Chris nor Juri have approved")
                elif not chris_approved:
                    print("⏳ Waiting for Chris approval (Juri ✅ approved)")  
                elif not juri_approved:
                    print("⏳ Waiting for Juri approval (Chris ✅ approved)")
                
                print(f"📨 Use: python3 scripts/mexc_trader.py request_approval {symbol.replace('USDT', '')} {amount}")
                print("⏸️ Trade STOPPED - Only button approvals accepted!")
                sys.exit(0)
            else:
                print("✅ DUAL APPROVAL CONFIRMED")
                print(f"✅ Chris approved: {chris_approved}")  
                print(f"✅ Juri approved: {juri_approved}")
                if dry_run:
                    print("🧪 DRY RUN - Would proceed with trade execution...")
                else:
                    print("🚀 Proceeding with trade execution...")
            
            # Execute trade (only if approved or dry run)
            result = trader.market_buy(symbol, amount)
            print(f"📈 Trade result: {json.dumps(result, indent=2)}")
            
            if result.get('status') == 'FILLED':
                # Update database
                filled_qty = float(result.get('executedQty', 0))
                avg_price = float(result.get('cummulativeQuoteQty', amount)) / filled_qty if filled_qty > 0 else 0
                trader.update_database(symbol, amount, filled_qty, avg_price)
                
        elif command == 'request_approval':
            if len(sys.argv) < 4:
                print("❌ Usage: request_approval SYMBOL AMOUNT")
                sys.exit(1)
                
            symbol = sys.argv[2].upper()
            amount = float(sys.argv[3])
            
            if not symbol.endswith('USDT'):
                symbol += 'USDT'
            
            # Get current price (simplified - would use coinpaprika)
            current_price = 0.50  # Placeholder
            market_cap = 500_000_000  # Placeholder
            
            success = send_button_approval(symbol, amount, current_price, market_cap)
            if success:
                print(f"✅ Approval request sent for {symbol}")
            else:
                print(f"❌ Failed to send approval request")
                
        elif command == 'check_approval':
            if len(sys.argv) < 3:
                print("❌ Usage: check_approval SYMBOL")
                sys.exit(1)
                
            symbol = sys.argv[2].upper()
            if not symbol.endswith('USDT'):
                symbol += 'USDT'
                
            chris_approved, juri_approved = check_button_approvals(symbol)
            coin = symbol.replace('USDT', '')
            
            print(f"📊 Approval Status for {coin}:")
            print(f"  Chris: {'✅ APPROVED' if chris_approved else '❌ PENDING'}")
            print(f"  Juri: {'✅ APPROVED' if juri_approved else '❌ PENDING'}")
            
            if chris_approved and juri_approved:
                print("✅ DUAL APPROVAL COMPLETE - Trade can proceed!")
            else:
                print("⏳ Waiting for approval(s)")
                
        elif command == 'validate_market_cap':
            if len(sys.argv) < 3:
                print("❌ Usage: validate_market_cap SYMBOL")
                sys.exit(1)
                
            symbol = sys.argv[2].lower()
            # Would implement market cap validation here
            print(f"🔍 Market cap validation for {symbol} - implement coinpaprika check")
            
        else:
            print(f"❌ Unknown command: {command}")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()