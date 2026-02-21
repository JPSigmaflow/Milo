#!/usr/bin/env python3
import json

CONFIG = "/Users/milo/.openclaw/workspace/shared/crypto-scanner/config.json"

# These are ACTUALLY ALIVE (confirmed via page title):
yt_alive = {
    "UCRvqjQPSeaWn-uEx-w0XOIg": "Benjamin Cowen",
    "UCjemQfjaXAzA-95RKoy9n_g": "Discover Crypto (ex-BitBoy)",
    "UCN9Nj4tjXbVTLYWN0EKly_Q": "Crypto Banter",
    "UCI7M65p3A-D3P4v5qW8POxQ": "CryptosRUs",
    "UCCatR7nWbYrkVXdxXb4cGXw": "DataDash",
    "UCh1ob28ceGdqohUnR7vBACA": "Finematics",
    "UClgJyzwGs-GyaNxUHcLZrkg": "InvestAnswers",
    "UCVVX-7tHff75fRAEEEnZiAQ": "Miles Deutscher Finance",
    "UCBH5VZE_Y4F3CMcPIzPEB5A": "Real Vision Presents",
    "UCsYYksPHiGqXHPoHI-fm5sg": "Whiteboard Crypto",
}

with open(CONFIG) as f:
    cfg = json.load(f)

# Add back the alive channels
for channel_id, name in yt_alive.items():
    # Update name if changed
    existing = [c for c in cfg['youtube']['channels'] if c['id'] == channel_id]
    if not existing:
        cfg['youtube']['channels'].append({"name": name, "id": channel_id})
        print(f"Re-added: {name} ({channel_id})")
    else:
        print(f"Already present: {name}")

print(f"\nYouTube channels now: {len(cfg['youtube']['channels'])}")

with open(CONFIG, 'w') as f:
    json.dump(cfg, f, indent=2)
    f.write('\n')
