#!/usr/bin/env python3
"""
Portfolio Scheduler - Updates dashboard every 30 minutes
Runs as background service, independent of cron
"""

import time
import subprocess
import os
from datetime import datetime
from pathlib import Path

WORKSPACE = Path("/Users/milo/.openclaw/workspace")
DASHBOARD_DIR = WORKSPACE / "shared/crypto-dashboard"
PORTFOLIO_DB = WORKSPACE / "shared/portfolio.db"

def update_dashboard():
    """Run export-data.sh to update dashboard"""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 🔄 Starting dashboard update...")
    
    try:
        os.chdir(DASHBOARD_DIR)
        result = subprocess.run(['./export-data.sh'], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ✅ Dashboard updated successfully")
            return True
        else:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ⚠️ Dashboard update failed: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ⚠️ Dashboard update timed out")
        return False
    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ Dashboard update error: {e}")
        return False

def main():
    """Run scheduler loop"""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 🚀 Portfolio Scheduler started")
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 📊 Will update dashboard every 30 minutes")
    
    # Initial update
    update_dashboard()
    
    # Main loop
    while True:
        try:
            # Sleep for 30 minutes
            time.sleep(30 * 60)
            
            # Update dashboard
            update_dashboard()
            
        except KeyboardInterrupt:
            print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 🛑 Scheduler stopped by user")
            break
        except Exception as e:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ Unexpected error: {e}")
            # Continue running even after errors
            time.sleep(60)

if __name__ == "__main__":
    main()
