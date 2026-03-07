#!/usr/bin/env python3
import json

NEW_ACCOUNTS = [
    "frxresearch",      # 24K - Daily signals
    "masonnystrom",     # 29K - Messari researcher
    "ZeMariaMacedo",    # 31K - Delphi Digital
    "katherineykwu",    # 65K - ex-Coinbase Ventures
    "_Checkmatey_",     # 62K - Glassnode on-chain
    "ASvanevik",        # 100K - Nansen CEO
    "JamesTodaroMD",    # 141K - DeFi investor
    "PaikCapital",      # 63K - DeFi TA
    "theklineventure",  # 14K - The Graph co-founder
    "JoeBGrech",        # 23K - Chiliz, DeFi
    "CryptoMichNL",     # 585K - Daily trader
    "MadelonVos__",     # 64K - TA + macro
    "CryptoDonAlt",     # 391K - Bitcoin trends
    "CryptoKaleo",      # 478K - Options trader
    "woonomic",         # 1M - Willy Woo
    "SushiSwap",        # 215K - DeFi protocol
    "ohmzeus",          # 65K - Olympus, token economics
    "LayahHeilpern",    # 222K - Bitcoin advocate
    "josiebellini",     # 32K - NFT artist
    "NoelleInMadrid"    # 9.9K - Institutional insights
]

CONFIG_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/config.json'

# Load config
with open(CONFIG_PATH, 'r') as f:
    config = json.load(f)

# Get current accounts (lowercase for comparison)
current = [acc.lower() for acc in config['x']['accounts']]
before_count = len(config['x']['accounts'])

# Add new accounts if not already present
added = []
for acc in NEW_ACCOUNTS:
    if acc.lower() not in current:
        config['x']['accounts'].append(acc)
        added.append(acc)
        print(f"✅ Added: @{acc}")
    else:
        print(f"⏭️  Skipped: @{acc} (already in config)")

# Sort alphabetically (case-insensitive)
config['x']['accounts'].sort(key=str.lower)

# Write back
with open(CONFIG_PATH, 'w') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

after_count = len(config['x']['accounts'])

print(f"\n📊 SUMMARY")
print(f"Before: {before_count} accounts")
print(f"Added: {len(added)} new accounts")
print(f"After: {after_count} accounts")
print(f"\n✅ Config updated: {CONFIG_PATH}")
