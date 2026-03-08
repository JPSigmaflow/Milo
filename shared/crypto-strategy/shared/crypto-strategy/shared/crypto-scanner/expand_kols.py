#!/usr/bin/env python3
"""Expand KOL list by verifying candidates via X API."""
import json, time, subprocess, urllib.parse, sys, os

CONFIG = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/config.json'
AUTH_TOKEN = '9a90162cad8ecbe888dc05d97af9fc40c5fbe1bf'
CT0 = 'f17ab672a1e8016cbaca3c2a92b401166fefd61673940cee886678b5c386b481dfedba1be2ef49d34b09c33c0502489d9a403b9f1f7b4aa0bd1de24552c6b9e34a3258e3e09bd3162aeaa5c97a7d2052'
BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'

# Load existing
with open(CONFIG) as f:
    config = json.load(f)
existing = set(a.lower() for a in config['x']['accounts'])

# Big candidate list - crypto KOLs from various sources
candidates = [
    # From task list
    "CryptoCobain", "CryptoMessiah", "inversebrah", "Crypto_Chase",
    "jimchanos", "ColdBloodShill", "CamiRusso", "SquishChaos",
    "WhalePanda", "CoinBureau", "CryptoBanter", "ArkhamIntel",
    "CoinGecko", "ZssBecker", "woonomic", "TechLead",
    "CryptoDonAlt", "crypto_rand", "BobLoukas", "FatManTerra",
    "OlimpioCrypto",
    # Well-known crypto KOLs not likely in list
    "MoonCarl", "IvanOnTech", "NicholasCosby",
    "WuBlockchain", "WhaleChart", "whale_alert",
    "TheCryptoDog", "VentureCoinist", "NovaBitcoin",
    "BitBoyBackup", "ToneVays", "DataDash", "Sheldon_Sniper",
    "CryptoWendyO", "TheMoonCarl", "EllioTrades",
    "AltcoinDailyio", "MMCrypto", "CryptoLark", "CryptoJack",
    "CryptoWZRD", "TheCryptoLark", "LayahHeilpern",
    "SatoshiStacker", "CryptoGodJohn", "CryptoYoda1338",
    "MacroScope17", "DaanCrypto", "SmartContracter",
    "AltcoinSherpa", "IncomeSharks", "CryptoTony__",
    "CryptoKaleo", "GiganticRebirth", "MustStopMurad",
    "SolBigBrain", "RookieXBT", "KillTheWolf0",
    "PairedJudy", "CryptoGainz1", "DefiMinist",
    "0xHamz", "ThinkingUSD", "Hsaka_trades",
    "CryptoDrake_", "HalBorland", "CryptoCapo_",
    "TradingRoomApp", "TaikiMaeda2", "LadyofCrypto1",
    "HsakaTrades", "Rewkang", "Delphi_Digital",
    "theaborovskis", "SpiritofCrypto", "AndrewMoK",
    "cryptoFMaps", "Yano", "cryptodegen888",
    "CryptoTeachers", "Zoran_crypto",
    # More well-known accounts
    "kraborovskis", "TheCryptomist", "JackNiewold",
    "Fiskantes", "CryptoGirlNova", "DefiSurfer808",
    "CryptoHayes", "HankyTonkMan", "Bitboy_Crypto",
    "AshCryptoReal", "MikeBurgersburg", "CryptoKaduna",
    "ShardiB2", "CryptoNewton", "Nebraskangooner",
    "Route2FI", "TheDeFinvestor", "TheDefiantNews",
    "DegenSpartan", "lookonchain", "spot_on_chain",
    "BTC_Archive", "DocumentingBTC", "Bitcoin_Magazine",
    "pumpdotfun", "MartyBent", "GuySwann",
    "BitcoinPierre", "ODELL", "NVK",
    "francispouliot_", "loaborovskis", "BitcoinBroski",
    "CryptoCapo", "CryptoGodJohn", "Zeneca_33",
    "punk6529", "faaborovskis", "GMoney",
    "Andrew_Kang_", "CryptoMessiah_", "EmberCN",
    "Dying_Trading", "naiivememe", "Cryptotony",
    "ColdBloodShill", "ThinkingUSD", "Flood_cap",
    "GCRClassic", "zaborovskis", "raborovskis",
    "staborovskis", "kaborovskis",
    # CoinCarp / CoinGecko known top KOLs
    "CryptoGems555", "CryptoFinally", "NateGeraci",
    "CanteringClark", "PeterSchiff", "RichardHeartWin",
    "MacnBTC", "100trillionUSD", "KoroushAK",
    "CryptoMichNL", "CryptoJelleNL", "TheCryptoLark",
    "ScottMelker", "RaoulGMI", "PeterLBrandt",
    "CathieDWood", "BanklessHQ", "sassal0x",
    "theaborovskis", "CryptoBardastan", "MarioNawfal",
    "BitcoinFear", "CryptoQuant_com",
    "WatcherGuru", "unusual_whales", "tier10k",
    "GMoneyNFT", "punk6529", "ZachXBT",
    "DegenNews", "MilesDeutscher",
    "blaborovskis", "claborovskis", "dlaborovskis",
]

# Dedupe and filter already existing
seen = set()
to_check = []
for c in candidates:
    cl = c.lower()
    if cl not in existing and cl not in seen:
        seen.add(cl)
        to_check.append(c)

print(f"Candidates to check: {len(to_check)}", flush=True)

features = {
    "hidden_profile_subscriptions_enabled": True,
    "rweb_tipjar_consumption_enabled": True,
    "responsive_web_graphql_exclude_directive_enabled": True,
    "verified_phone_label_enabled": False,
    "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
    "responsive_web_graphql_timeline_navigation_enabled": True,
    "creator_subscriptions_tweet_preview_api_enabled": True,
    "hidden_profile_likes_enabled": True,
    "subscriptions_verification_info_verified_since_enabled": True,
    "highlights_tweets_tab_ui_enabled": True,
}
features_enc = urllib.parse.quote(json.dumps(features))

results = []
added = []
errors = []
rate_limited = False

for i, handle in enumerate(to_check):
    vars_enc = urllib.parse.quote(json.dumps({"screen_name": handle}))
    url = f"https://x.com/i/api/graphql/xc8f1g7BYqr6VTzTbvNlGw/UserByScreenName?variables={vars_enc}&features={features_enc}"
    
    cmd = [
        'curl', '-sL', '--max-time', '10', url,
        '-H', f'Cookie: auth_token={AUTH_TOKEN}; ct0={CT0}',
        '-H', f'x-csrf-token: {CT0}',
        '-H', f'Authorization: Bearer {BEARER}',
        '-H', 'User-Agent: Mozilla/5.0',
    ]
    
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        data = json.loads(r.stdout)
        
        if 'errors' in data:
            err_msg = data['errors'][0].get('message', '')
            if 'Rate limit' in err_msg or 'rate limit' in err_msg.lower():
                print(f"RATE LIMITED at {handle} (#{i})")
                rate_limited = True
                break
            errors.append({"handle": handle, "error": err_msg})
            print(f"  [{i+1}/{len(to_check)}] {handle}: ERROR - {err_msg}")
        elif 'data' in data and 'user' in data['data'] and data['data']['user']:
            user = data['data']['user']['result']
            if user.get('__typename') == 'UserUnavailable':
                errors.append({"handle": handle, "error": "suspended/unavailable"})
                print(f"  [{i+1}/{len(to_check)}] {handle}: SUSPENDED")
            else:
                legacy = user.get('legacy', {})
                followers = legacy.get('followers_count', 0)
                name = legacy.get('name', handle)
                screen = legacy.get('screen_name', handle)
                
                entry = {
                    "handle": screen,
                    "name": name,
                    "followers": followers,
                    "added": followers >= 10000
                }
                results.append(entry)
                
                if followers >= 10000:
                    added.append(screen)
                    print(f"  [{i+1}/{len(to_check)}] {screen}: ✅ {followers:,} followers")
                else:
                    print(f"  [{i+1}/{len(to_check)}] {screen}: ❌ {followers:,} (too few)")
        else:
            errors.append({"handle": handle, "error": "not found"})
            print(f"  [{i+1}/{len(to_check)}] {handle}: NOT FOUND")
    except Exception as e:
        errors.append({"handle": handle, "error": str(e)})
        print(f"  [{i+1}/{len(to_check)}] {handle}: EXCEPTION - {e}")
    
    time.sleep(2)

# Save results
outdir = '/Users/milo/.openclaw/workspace/shared/crypto-scanner'

report = {
    "checked": len(results) + len(errors),
    "added": added,
    "added_count": len(added),
    "below_threshold": [r for r in results if not r['added']],
    "errors": errors,
    "rate_limited": rate_limited,
    "results": results,
}
with open(f"{outdir}/expansion-broad.json", 'w') as f:
    json.dump(report, f, indent=2)

# Update config
if added:
    config['x']['accounts'].extend(added)
    # Dedupe
    seen2 = set()
    deduped = []
    for a in config['x']['accounts']:
        if a.lower() not in seen2:
            seen2.add(a.lower())
            deduped.append(a)
    config['x']['accounts'] = deduped
    with open(CONFIG, 'w') as f:
        json.dump(config, f, indent=2)

# Write markdown report
md = f"# KOL Broad Expansion - Round 2\n\n"
md += f"**Checked:** {len(results) + len(errors)} candidates\n"
md += f"**Added:** {len(added)} new accounts\n"
md += f"**Total in scanner:** {len(config['x']['accounts'])}\n"
md += f"**Rate limited:** {rate_limited}\n\n"
md += "## Added Accounts\n\n"
for r in results:
    if r['added']:
        md += f"- @{r['handle']} — {r['name']} ({r['followers']:,} followers)\n"
md += "\n## Below Threshold (<10K)\n\n"
for r in results:
    if not r['added']:
        md += f"- @{r['handle']} ({r['followers']:,})\n"
md += "\n## Errors\n\n"
for e in errors:
    md += f"- @{e['handle']}: {e['error']}\n"

with open(f"{outdir}/expansion-broad.md", 'w') as f:
    f.write(md)

print(f"\nDONE: Added {len(added)}, total now {len(config['x']['accounts'])}")
