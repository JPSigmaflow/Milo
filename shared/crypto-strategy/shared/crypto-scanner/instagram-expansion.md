# Instagram Crypto KOL Expansion Report

**Date:** 2026-02-19  
**Status:** ✅ Complete — 55 accounts identified, scanner built

---

## Scraping Method

### What Works ✅
**Instagram Web Profile API** (unauthenticated):
```
GET https://www.instagram.com/api/v1/users/web_profile_info/?username=HANDLE
Headers:
  User-Agent: Mozilla/5.0 ...
  X-IG-App-ID: 936619743392459
```
- Returns: user profile + last 12 posts with captions, likes, comments, timestamps
- No login required
- Rate limit: ~1 req/sec seems safe, gets throttled/blocked after rapid bursts
- Some large accounts (e.g. `bitcoin`, `ethereum`) return `{"status":"ok"}` with no user data (likely shadowbanned or restricted)

### What Doesn't Work ❌
- `/?__a=1&__d=dis` — Returns HTTP 201, no useful data
- `rsshub.app` — Returns 403, deprecated for public use
- Any endpoint without `X-IG-App-ID` header — returns empty `{"status":"ok"}`

### Limitations
- Rate limiting kicks in after ~30-50 rapid requests
- Some accounts return PARSE_ERR (likely HTML login wall instead of JSON)
- No pagination for posts beyond the initial 12
- No auth = limited to public profiles only

---

## Scanner Built

**File:** `scanners/instagram.js`  
**Export:** `scanIg()`  
**Output:** `[{source: 'instagram', handle, text, likes, comments, time, postId, url}]`

Features:
- Fetches last 12 posts per account via unauthenticated API
- Filters by crypto keywords (skipped for known-crypto accounts)
- Deduplicates via seen.json
- 500ms throttle between accounts
- Caps seen list at 5000 entries

---

## Identified Accounts (55)

### Tier 1: Major (100K+ followers)

| Handle | Category | Followers |
|--------|----------|-----------|
| tombilyeu | educator | 1,966K |
| binance | exchange | 4,843K |
| vitallybuterin | whale | 898K |
| coinmarketcap | media | 812K |
| thecryptolarkdavisofficial | educator | 767K |
| cryptonary | media | 728K |
| cryptoexplorer | media | 566K |
| coingecko | media | 559K |
| coinbase | exchange | 560K |
| bitboy_crypto | trader | 495K |
| altcoindaily | media | 488K |
| sharecrypto | media | 449K |
| cointelegraph | media | 424K |
| investdiva | educator | 396K |
| bitcoinmagazine | media | 378K |
| coingrams | meme | 335K |
| coindesk | media | 240K |
| thecryptograph | media | 177K |
| layahheilpern | educator | 137K |
| solana | media | 135K |
| cryptowendyo | educator | 106K |

### Tier 2: Mid (10K–100K followers)

| Handle | Category | Followers |
|--------|----------|-----------|
| cryptohumor | meme | 81K |
| cryptojack | educator | 64K |
| cryptocasey | educator | 61K |
| felix_hartmann | trader | 52K |
| thecryptolark | educator | 44K |
| girl_gone_crypto | educator | 41K |
| coinstats | media | 27K |
| thefatbitcoin | meme | 26K |
| thecoinrise | media | 26K |
| ivanontech | educator | 22K |
| cryptofinally | educator | 17K |
| cryptoworldjosh | trader | 12K |
| scottmelker | trader | 10K |
| cryptoland_ | meme | 10K |
| crypto_daily | media | 10K |

### Tier 3: Niche (1K–10K followers)

| Handle | Category | Followers |
|--------|----------|-----------|
| cryptostache | educator | 8K |
| polkadotnetwork | media | 8K |
| thedefiant.io | media | 5K |
| krypticrooks | meme | 3K |
| nftcollector | media | 2K |

### Tier 4: Micro / Unverified

| Handle | Category | Notes |
|--------|----------|-------|
| cryptomason | trader | 34 (might be wrong handle) |
| cryptobanter | media | 302 |
| anndylian | cn-kol | 129 |

### Additional Known (not API-verified, from articles)

| Handle | Category | Est. Followers |
|--------|----------|----------------|
| robertkiyosaki | educator | 2.9M+ |
| irenezhao | cn-kol / NFT | 436K |
| nft_lately | media | ~420 (small) |
| youngdumbcrypto | educator | unknown |
| cryptoplayhouse | educator | unknown |
| crypt0snews | media | unknown |

---

## Config Updated

Added `instagram` object to `config.json` with 44 verified accounts in the `accounts` array and 15 known-crypto accounts that skip keyword filtering.

---

## Recommendations

1. **Scanner is functional** — run `scanIg()` on a 10-min interval alongside other scanners
2. **Rate limiting caution** — with 44 accounts × 500ms = ~22sec per scan cycle, well within limits
3. **Add auth for more data** — logging in via cookies would unlock:
   - More than 12 posts per profile
   - Private accounts
   - Story content
   - Reels engagement data
4. **Chinese KOLs are scarce on IG** — most Chinese crypto KOLs use WeChat, Weibo, Douyin. Only `anndylian` and `irenezhao` have notable IG presence
5. **Best signal accounts** for crypto alpha: `cryptonary`, `altcoindaily`, `coin.bureau`, `cointelegraph`, `bitcoinmagazine`
6. **Consider adding**: `@whale_alert_io` (if they create IG), any new accounts from X cross-posts
