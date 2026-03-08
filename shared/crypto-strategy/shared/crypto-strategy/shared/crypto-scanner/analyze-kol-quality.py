#!/usr/bin/env python3
"""
KOL Quality Analysis - Understand what we have
"""
import json
import sqlite3
from datetime import datetime, timedelta
from collections import defaultdict

CONFIG_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/config.json'
SCANNER_DB = '/Users/milo/.openclaw/workspace/shared/crypto-dashboard/scanner.db'

# Load config
with open(CONFIG_PATH, 'r') as f:
    config = json.load(f)

x_accounts = config['x']['accounts']
print(f"📊 Analyzing {len(x_accounts)} X/Twitter KOLs\n")

# Connect to scanner.db
conn = sqlite3.connect(SCANNER_DB)
cursor = conn.cursor()

# Get all coins discovered
cursor.execute("""
    SELECT symbol, name, score, source_channels, scanned_at
    FROM coins
    ORDER BY scanned_at DESC
""")

coins = cursor.fetchall()
print(f"📈 Found {len(coins)} coins in scanner database\n")

# Analyze sources
source_breakdown = defaultdict(int)
x_source_breakdown = defaultdict(int)

for symbol, name, score, sources, scanned_at in coins:
    if not sources:
        continue
    
    # Parse source_channels (could be JSON or comma-separated)
    try:
        import ast
        source_list = ast.literal_eval(sources) if sources.startswith('[') else sources.split(',')
    except:
        source_list = sources.split(',') if sources else []
    
    for source in source_list:
        source = source.strip()
        
        if source.startswith('x:') or source.startswith('twitter:'):
            handle = source.replace('x:', '').replace('twitter:', '').strip()
            x_source_breakdown[handle.lower()] += 1
            source_breakdown['X/Twitter'] += 1
        elif 'reddit' in source.lower():
            source_breakdown['Reddit'] += 1
        elif 'telegram' in source.lower():
            source_breakdown['Telegram'] += 1
        elif 'cryptopanic' in source.lower():
            source_breakdown['CryptoPanic'] += 1
        elif 'coingecko' in source.lower():
            source_breakdown['CoinGecko'] += 1
        else:
            source_breakdown['Other'] += 1

print("🎯 SIGNAL SOURCES (All Time)\n")
for src, count in sorted(source_breakdown.items(), key=lambda x: x[1], reverse=True):
    print(f"  {src}: {count} coin discoveries")

# Find top performing KOLs
if x_source_breakdown:
    print(f"\n🏆 TOP 20 X/Twitter KOLs (by coin discoveries)\n")
    top_kols = sorted(x_source_breakdown.items(), key=lambda x: x[1], reverse=True)[:20]
    
    for i, (handle, count) in enumerate(top_kols, 1):
        in_config = any(acc.lower() == handle for acc in x_accounts)
        status = "✅" if in_config else "❌"
        print(f"  {i:2}. {status} @{handle}: {count} discoveries")
    
    # Check how many of our 1,137 KOLs actually generated signals
    active_kols = [h for h in x_source_breakdown.keys() if any(acc.lower() == h for acc in x_accounts)]
    
    print(f"\n📈 ACTIVITY STATS")
    print(f"  KOLs in config: {len(x_accounts)}")
    print(f"  KOLs with discoveries: {len(active_kols)}")
    print(f"  Never mentioned a coin: {len(x_accounts) - len(active_kols)}")
    print(f"  Activity rate: {len(active_kols)/len(x_accounts)*100:.1f}%")
    
    # Top performers not in config
    missing_performers = [(h, c) for h, c in top_kols if not any(acc.lower() == h for acc in x_accounts)]
    if missing_performers:
        print(f"\n⚠️  HIGH-PERFORMING KOLS NOT IN CONFIG:")
        for handle, count in missing_performers[:10]:
            print(f"     @{handle}: {count} discoveries")
else:
    print("\n⚠️  No X/Twitter sources found in scanner database")

# Show recent high-score coins
print(f"\n🌟 RECENT HIGH-SCORE DISCOVERIES (Score ≥ 70)\n")
cursor.execute("""
    SELECT symbol, name, score, source_channels, scanned_at
    FROM coins
    WHERE score >= 70
    ORDER BY scanned_at DESC
    LIMIT 10
""")

high_scores = cursor.fetchall()
for symbol, name, score, sources, scanned_at in high_scores:
    date = scanned_at.split('T')[0] if 'T' in scanned_at else scanned_at[:10]
    print(f"  {symbol} ({name}) - Score: {score} | {date}")
    if sources:
        print(f"    Sources: {sources[:80]}...")

conn.close()

print("\n✅ Analysis complete")
print(f"\n💡 RECOMMENDATIONS:")
if x_source_breakdown:
    print(f"  1. {len(active_kols)} active KOLs = core value. Focus here!")
    print(f"  2. {len(x_accounts) - len(active_kols)} KOLs never mentioned coins = cleanup candidates")
    print(f"  3. Build 'performance score' tracking which KOLs find coins that pump")
    print(f"  4. Current config quality: {len(active_kols)/len(x_accounts)*100:.0f}% active (good!)")
else:
    print(f"  1. Scanner might be using different source format")
    print(f"  2. Check pending-alerts.json for active sources")
    print(f"  3. Verify KOL scanner is running")
