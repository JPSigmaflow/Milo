#!/usr/bin/env python3
import json

CONFIG = "/Users/milo/.openclaw/workspace/shared/crypto-scanner/config.json"

with open(CONFIG) as f:
    cfg = json.load(f)

# === TELEGRAM: Remove 26 dead channels ===
tg_dead = [
    "arbitrum_official", "avalanche_avax", "azuki_official", "base_channel",
    "birdeye_so", "blocktempo", "chainnewscn", "crypto_dotcom", "decrypt_daily",
    "delphi_digital", "dimo_network", "doge_official", "EigenLayerChannel",
    "electric_capital", "fenbushi_capital", "huobi_cn", "HyperliquidX",
    "illuvium_official", "marsfinance", "messaricrypto", "ocean_protocol",
    "paradigm_official", "pudgy_penguins", "shiba_official", "virtual_protocol",
    "waterdrip_capital"
]
tg_before = len(cfg['telegram']['channels'])
cfg['telegram']['channels'] = [c for c in cfg['telegram']['channels'] if c not in tg_dead]
tg_after = len(cfg['telegram']['channels'])
print(f"Telegram: {tg_before} → {tg_after} (removed {tg_before - tg_after})")

# === REDDIT: Remove 3 dead subs ===
reddit_dead = ["AirdropAlert", "Avalanche", "CryptoGemDiscovery"]
r_before = len(cfg['reddit']['subreddits'])
cfg['reddit']['subreddits'] = [s for s in cfg['reddit']['subreddits'] if s not in reddit_dead]
r_after = len(cfg['reddit']['subreddits'])
print(f"Reddit: {r_before} → {r_after} (removed {r_before - r_after})")

# === YOUTUBE: Remove 25 dead channels ===
yt_dead_ids = [
    "UCKQvGU-qtjGlArsgMu7Bcrg", "UCQrbbJKCRbsTCaK9xf34sZQ",
    "UCRvqjQPSeaWn-uEx-w0XOIg", "UCjemQfjaXAzA-95RKoy9n_g",
    "UCROBQsU_ABJQ2wBhdT_aBfQ", "UCB_HBJoETFHCIjDXBO2GGWA",
    "UCN9Nj4tjXbVTLYWN0EKly_Q", "UCuSGhbOAgNR1KQMz2-yz_CA",
    "UC67AEEecqFEc92nVEqBreiA", "UCQglaVhGOsHop6McJKVYH_A",
    "UC6F5vfcNu-R3OGR9FXNwrig", "UCI7M65p3A-D3P4v5qW8POxQ",
    "UCCatR7nWbYrkVXdxXb4cGXw", "UCJgHxpqfitLFB2eJKMGMhiA",
    "UCh1ob28ceGdqohUnR7vBACA", "UClgJyzwGs-GyaNxUHcLZrkg",
    "UC8s-JMdZEUHkXpGOPQzIC2g", "UCVVX-7tHff75fRAEEEnZiAQ",
    "UCkiJFEfm3HmrEZMwzG5CYg", "UCBH5VZE_Y4F3CMcPIzPEB5A",
    "UCkU60bz7Uk55HiiRH5Nqe9A", "UCrDe0s5BlDAMr_dJzr1QJSA",
    "UCc4Rz_T9Sb1w5SVhGoCbDyw", "UCWiiMnsnw5Isc2PP1wFe1BQ",
    "UCsYYksPHiGqXHPoHI-fm5sg"
]
yt_before = len(cfg['youtube']['channels'])
cfg['youtube']['channels'] = [c for c in cfg['youtube']['channels'] if c['id'] not in yt_dead_ids]
yt_after = len(cfg['youtube']['channels'])
print(f"YouTube: {yt_before} → {yt_after} (removed {yt_before - yt_after})")

# === X/TWITTER: Only remove definitively dead (small page, not rate-limited) ===
x_dead = ["0x0xfeng", "0xC_Explorer", "0xHamz"]
x_before = len(cfg['x']['accounts'])
cfg['x']['accounts'] = [a for a in cfg['x']['accounts'] if a not in x_dead]
x_after = len(cfg['x']['accounts'])
print(f"X/Twitter: {x_before} → {x_after} (removed {x_before - x_after})")

# === INSTAGRAM: No dead confirmed (login wall) ===
print(f"Instagram: {len(cfg['instagram']['accounts'])} → {len(cfg['instagram']['accounts'])} (no changes)")

with open(CONFIG, 'w') as f:
    json.dump(cfg, f, indent=2)
    f.write('\n')

print("\nConfig updated successfully!")
