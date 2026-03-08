#!/usr/bin/env python3
"""
Button Handler for Crypto Trader Approvals
Processes Telegram inline button callbacks and records approvals
"""

import sys
import json
import os
from pathlib import Path
from datetime import datetime

WORKSPACE = Path("/Users/milo/.openclaw/workspace")

def process_button_callback(callback_data, user_id, username):
    """Process button callback and record approval/rejection"""
    
    # Parse callback data: APPROVE_XTZ_CHRIS, REJECT_XTZ, etc.
    parts = callback_data.split('_')
    if len(parts) < 2:
        print(f"❌ Invalid callback format: {callback_data}")
        return False
    
    action = parts[0]  # APPROVE or REJECT
    coin = parts[1]    # XTZ, STX, etc.
    
    # Validate user permissions
    if action == 'APPROVE':
        if len(parts) < 3:
            print(f"❌ Missing user info in callback: {callback_data}")
            return False
            
        approver = parts[2]  # CHRIS or JURI
        
        # Validate user ID matches expected approver
        expected_ids = {
            'CHRIS': '7590333825',
            'JURI': '6162586520'
        }
        
        if user_id != expected_ids.get(approver):
            print(f"❌ Unauthorized approval attempt: {username} ({user_id}) tried to approve as {approver}")
            return False
    
    # Create/update approval file
    approval_file = WORKSPACE / f"private/approvals_{coin}.json"
    
    if approval_file.exists():
        with open(approval_file, 'r') as f:
            approvals = json.load(f)
    else:
        approvals = {
            'coin': coin,
            'chris': False,
            'juri': False,
            'created_at': datetime.now().isoformat(),
            'history': []
        }
    
    # Record the action
    timestamp = datetime.now().isoformat()
    
    if action == 'APPROVE':
        approver_key = approver.lower()
        approvals[approver_key] = True
        approvals['history'].append({
            'action': 'APPROVE',
            'user': approver,
            'user_id': user_id,
            'username': username,
            'timestamp': timestamp
        })
        print(f"✅ {approver} approved {coin}")
        
    elif action == 'REJECT':
        # Reset all approvals on rejection
        approvals['chris'] = False
        approvals['juri'] = False
        approvals['history'].append({
            'action': 'REJECT',
            'user_id': user_id,
            'username': username,
            'timestamp': timestamp
        })
        print(f"❌ {username} rejected {coin} trade - all approvals reset")
    
    # Save updated approvals
    approvals['updated_at'] = timestamp
    
    with open(approval_file, 'w') as f:
        json.dump(approvals, f, indent=2)
    
    # Check if dual approval complete
    if approvals['chris'] and approvals['juri']:
        print(f"🎉 DUAL APPROVAL COMPLETE for {coin}!")
        print(f"✅ Chris: {approvals['chris']}")
        print(f"✅ Juri: {approvals['juri']}")
        return True
    
    return True

def main():
    if len(sys.argv) < 4:
        print("Usage: python3 button_handler.py CALLBACK_DATA USER_ID USERNAME")
        print("Example: python3 button_handler.py APPROVE_XTZ_CHRIS 7590333825 'Chris Schulz'")
        sys.exit(1)
    
    callback_data = sys.argv[1]
    user_id = sys.argv[2]
    username = sys.argv[3]
    
    try:
        success = process_button_callback(callback_data, user_id, username)
        if success:
            print(f"✅ Button callback processed successfully")
        else:
            print(f"❌ Button callback processing failed")
    except Exception as e:
        print(f"❌ Error processing callback: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()