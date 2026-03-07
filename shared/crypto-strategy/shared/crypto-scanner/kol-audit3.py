#!/usr/bin/env python3
"""KOL Activity Audit - slow and steady to avoid rate limits"""
import subprocess, json, re, time, os
from datetime import datetime, timezone

BASE = '/Users/milo/.openclaw/workspace/shared/crypto-scanner'

# Collect all unique handles
handles = set()
with open(f'{BASE}/kol-expansion.json') as f:
    data = json.load(f)
    for item in data.get('x_verified', []):
        handles.add(item['handle'])
with open(f'{BASE}/kol-network-map.json') as f:
    data = json.load(f)
    for tier in data.get('tiers', {}).values():
        for item in tier:
            handles.add(item['handle'])
    for item in data.get('missing_accounts', []):
        handles.add(item['handle'])
with open(f'{BASE}/config.json') as f:
    data = json.load(f)
    for h in data.get('x', {}).get('accounts', []):
        handles.add(h)

# Load metadata
meta = {}
with open(f'{BASE}/kol-expansion.json') as f:
    for item in json.load(f).get('x_verified', []):
        meta[item['handle']] = {'followers': item.get('followers_approx', ''), 'category': item.get('category', ''), 'lang': item.get('lang', 'en')}
with open(f'{BASE}/kol-network-map.json') as f:
    data = json.load(f)
    for tier in data.get('tiers', {}).values():
        for item in tier:
            if item['handle'] not in meta:
                meta[item['handle']] = {'followers': item.get('followers', ''), 'category': item.get('category', ''), 'lang': 'en'}
    for item in data.get('missing_accounts', []):
        if item['handle'] not in meta:
            meta[item['handle']] = {'followers': '', 'category': item.get('reason', ''), 'lang': 'en'}

handles = sorted(handles)
total = len(handles)
results = []
now = datetime.now(timezone.utc)

# Load partial results if they exist
partial_file = f'{BASE}/kol-audit-partial.json'
done_handles = set()
if os.path.exists(partial_file):
    with open(partial_file) as f:
        results = json.load(f)
        done_handles = {r['handle'] for r in results}
    print(f'Resuming: {len(done_handles)} already done')

for i, handle in enumerate(handles):
    if handle in done_handles:
        print(f'[{i+1}/{total}] {handle} → SKIP (already done)', flush=True)
        continue
    
    # Wait 3 seconds between requests to avoid rate limiting
    time.sleep(3)
    
    try:
        r = subprocess.run(
            ['curl', '-sL', '--max-time', '12', 
             '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
             f'https://syndication.twitter.com/srv/timeline-profile/screen-name/{handle}'],
            capture_output=True, text=True, timeout=20
        )
        html = r.stdout
    except:
        html = ''
    
    status = 'UNCERTAIN'
    last_date = ''
    days_ago = None
    
    if 'Rate limit' in html or 'rate limit' in html:
        print(f'[{i+1}/{total}] {handle} → RATE_LIMITED, waiting 60s...', flush=True)
        time.sleep(60)
        # Retry once
        try:
            r = subprocess.run(
                ['curl', '-sL', '--max-time', '12',
                 '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                 f'https://syndication.twitter.com/srv/timeline-profile/screen-name/{handle}'],
                capture_output=True, text=True, timeout=20
            )
            html = r.stdout
        except:
            html = ''
    
    if html and 'Rate limit' not in html:
        match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html)
        if match:
            try:
                data = json.loads(match.group(1))
                has_results = data.get('props', {}).get('pageProps', {}).get('contextProvider', {}).get('hasResults', False)
                entries = data.get('props', {}).get('pageProps', {}).get('timeline', {}).get('entries', [])
                
                if not has_results:
                    status = 'SUSPENDED_OR_MISSING'
                elif not entries:
                    status = 'NO_TWEETS_VISIBLE'
                else:
                    dates = []
                    for e in entries:
                        tweet = e.get('content', {}).get('tweet', {})
                        if tweet.get('created_at'):
                            try:
                                dt = datetime.strptime(tweet['created_at'], '%a %b %d %H:%M:%S %z %Y')
                                dates.append(dt)
                            except:
                                pass
                    
                    if dates:
                        latest = max(dates)
                        days_ago = (now - latest).days
                        last_date = latest.strftime('%Y-%m-%d')
                        
                        # Note: syndication API may return CACHED old tweets
                        # We'll mark everything but flag the cache issue
                        if days_ago <= 7:
                            status = 'ACTIVE'
                        elif days_ago <= 30:
                            status = 'RECENT'
                        elif days_ago <= 180:
                            status = 'STALE_CACHE'
                        else:
                            status = 'OLD_CACHE'
                    else:
                        status = 'NO_DATES_FOUND'
            except json.JSONDecodeError:
                status = 'PARSE_ERROR'
    elif 'Rate limit' in html:
        status = 'RATE_LIMITED'
    
    m = meta.get(handle, {})
    entry = {
        'handle': handle,
        'status': status,
        'last_date': last_date,
        'days_ago': days_ago,
        'followers': m.get('followers', ''),
        'category': m.get('category', ''),
        'lang': m.get('lang', 'en')
    }
    results.append(entry)
    
    print(f'[{i+1}/{total}] {handle} → {status} ({last_date})', flush=True)
    
    # Save partial results every 10 accounts
    if len(results) % 10 == 0:
        with open(partial_file, 'w') as f:
            json.dump(results, f, indent=2)

# Save final results
with open(f'{BASE}/kol-audit-results.json', 'w') as f:
    json.dump(results, f, indent=2)

# Summary
by_status = {}
for r in results:
    s = r['status']
    by_status[s] = by_status.get(s, 0) + 1

print(f'\n=== SUMMARY ===')
for s, c in sorted(by_status.items()):
    print(f'{s}: {c}')
print(f'TOTAL: {len(results)}')
