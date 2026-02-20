# Crypto Scanner — API Infrastructure & Datenquellen

*Stand: 2026-02-12 | Alle getestet und verifiziert*

---

## 1. DexScreener API ✅ KOSTENLOS

**Base URL:** `https://api.dexscreener.com`
**Auth:** Keine (kein API-Key nötig!)
**Rate Limits:** 60-300 req/min je Endpunkt

### Endpunkte

| Endpunkt | Rate Limit | Nutzen |
|---|---|---|
| `/latest/dex/search?q={query}` | 300/min | Token/Pair Suche, Volume, Txns, Price Changes |
| `/latest/dex/pairs/{chainId}/{pairId}` | 300/min | Pair-Details mit Liquidität |
| `/tokens/v1/{chainId}/{tokenAddresses}` | 300/min | Bis zu 30 Token gleichzeitig |
| `/token-pairs/v1/{chainId}/{tokenAddress}` | 300/min | Alle Pools eines Tokens |
| `/token-profiles/latest/v1` | 60/min | **Neueste Token-Profile** (neue Listings!) |
| `/token-boosts/latest/v1` | 60/min | Tokens mit aktiven Boosts |
| `/token-boosts/top/v1` | 60/min | Tokens mit meisten Boosts |
| `/community-takeovers/latest/v1` | 60/min | Community Takeovers (CTO) |
| `/orders/v1/{chainId}/{tokenAddress}` | 60/min | Bezahlte Promoted Orders |

### Verfügbare Daten pro Pair
- **priceUsd, priceNative** — Aktueller Preis
- **txns** — Buys/Sells (5min, 1h, 6h, 24h)
- **volume** — USD Volume (5min, 1h, 6h, 24h)
- **priceChange** — % Change (5min, 1h, 6h, 24h)
- **liquidity** — USD, base, quote
- **fdv, marketCap**
- **pairCreatedAt** — Timestamp (für Alter-Berechnung)
- **chainId, dexId** — Chain & DEX Info

### Beispiel
```bash
curl -s "https://api.dexscreener.com/latest/dex/search?q=AI" | jq '.pairs[0]'
```

---

## 2. CoinGecko API ✅ KOSTENLOS (Free Tier)

**Base URL:** `https://api.coingecko.com/api/v3`
**Auth:** Keine für Free Tier (optional Demo API Key für höhere Limits)
**Rate Limits:** ~10-30 req/min (Free)

### Endpunkte

| Endpunkt | Daten | Getestet |
|---|---|---|
| `/coins/{id}?community_data=true&developer_data=true` | Social + Dev Stats | ✅ |
| `/search/trending` | Trending Coins, NFTs, Categories | ✅ |
| `/coins/list` | Alle Coin IDs | ✅ |
| `/coins/{id}/market_chart` | Historische Preise | ✅ |

### Developer Data (kostenlos verfügbar ✅)
- `forks`, `stars`, `subscribers` — GitHub Repo Stats
- `total_issues`, `closed_issues`
- `pull_requests_merged`, `pull_request_contributors`
- `commit_count_4_weeks` — Letzten 4 Wochen Commits
- `code_additions_deletions_4_weeks`
- `last_4_weeks_commit_activity_series`

### Community Data (kostenlos verfügbar ✅)
- `telegram_channel_user_count`
- `reddit_subscribers`, `reddit_accounts_active_48h`
- `reddit_average_posts_48h`, `reddit_average_comments_48h`

### Beispiel: Uniswap
```
DEV: stars=4948, forks=3042, PRs merged=214, contributors=11
COMMUNITY: telegram=null, reddit_subs=0
```

### Beispiel: Virtuals Protocol
```
DEV: stars=0, forks=0, commits_4w=0 (kein GitHub verlinkt!)
COMMUNITY: telegram=22945
Sentiment: 50% up / 50% down, Watchlist: 98099 users
```

**Wichtig:** CoinGecko developer_data basiert auf den in `links.repos_url.github` verlinkten Repos. Viele AI-Coins haben KEIN GitHub verlinkt → developer_data = leer.

---

## 3. GitHub API ✅ KOSTENLOS

**Base URL:** `https://api.github.com`
**Auth:** Optional (ohne: 60 req/h, mit Token: 5000 req/h)
**Empfehlung:** Personal Access Token erstellen für höhere Limits

### Endpunkte für Dev-Aktivität

| Endpunkt | Nutzen |
|---|---|
| `/search/repositories?q={project}` | Repos finden |
| `/repos/{owner}/{repo}` | Stars, Forks, Issues, Language, Updated |
| `/repos/{owner}/{repo}/stats/commit_activity` | Wöchentliche Commit-Aktivität |
| `/repos/{owner}/{repo}/stats/contributors` | Top Contributors + deren Commits |
| `/repos/{owner}/{repo}/stats/code_frequency` | Additions/Deletions pro Woche |
| `/repos/{owner}/{repo}/commits?since={date}` | Neueste Commits |

### Getestete Ergebnisse

**Virtual Protocol:**
- `Virtual-Protocol/react-virtual-ai` → ⭐28, 16 forks, TypeScript, last update Oct 2025
- Keine große Open-Source Aktivität sichtbar

**Griffain:**
- Kein offizielles GitHub gefunden (nur Forks/Clones mit 0-1 Stars)
- 🚨 Red Flag für Dev-Bewertung

### Dev-Score Berechnung
```
Stars > 100: +10 Punkte
Commits letzte 4 Wochen > 20: +15 Punkte  
Contributors > 5: +10 Punkte
Letzter Commit < 7 Tage: +10 Punkte
```

---

## 4. Social Sentiment — Kostenlose Optionen

### LunarCrush ⚠️ EINGESCHRÄNKT
- Free Tier existiert, aber stark limitiert
- API v2 mit API-Key → 10 Credits/Tag (sehr wenig)
- Beste kostenlose Daten: Galaxy Score, Alt Rank
- **Verdict:** Nur für Spot-Checks, nicht für Scanning

### Santiment ⚠️ TEUER
- Free Tier: Nur historische Daten mit Verzögerung
- API ab $49/Monat für Echtzeit
- **Verdict:** Zu teuer für unseren Use Case

### Reddit API ✅ KOSTENLOS
- OAuth2 Registration nötig (kostenlos)
- 60 req/min mit OAuth
- `/r/{subreddit}/hot`, `/r/{subreddit}/new`
- Subreddit-Suche: `/subreddits/search?q={coin}`
- **Verdict:** Gut für Sentiment-Checks

### CoinGecko Social ✅ KOSTENLOS (in coins/{id} enthalten)
- Telegram Members
- Reddit Stats (wenn Subreddit verlinkt)
- Sentiment Votes
- Watchlist Count (Proxy für Interesse)

### Twitter/X ❌ TEUER
- Basic API: $100/Monat
- Alternative: Nitter-Scraping (fragil)
- **Verdict:** Vorerst ohne

---

## 5. Zusätzliche kostenlose Quellen

### GeckoTerminal (by CoinGecko) ✅
- Kostenlose DEX-Daten
- `/api/v2/networks/{network}/new_pools` — Neue Pools!
- `/api/v2/networks/{network}/trending_pools`
- Gut als Ergänzung zu DexScreener

### Birdeye (Solana-fokussiert) ⚠️
- Free Tier mit API-Key
- Token Overview, Price History
- Limitiert auf 100 req/Tag (Free)

---

## 6. Kosten-Übersicht

| Quelle | Kosten | Limits (Free) | Qualität |
|---|---|---|---|
| DexScreener | ✅ Kostenlos | 60-300 req/min | ⭐⭐⭐⭐⭐ |
| CoinGecko | ✅ Kostenlos | ~30 req/min | ⭐⭐⭐⭐ |
| GitHub | ✅ Kostenlos | 5000/h (mit Token) | ⭐⭐⭐⭐ |
| Reddit | ✅ Kostenlos | 60 req/min | ⭐⭐⭐ |
| GeckoTerminal | ✅ Kostenlos | ~30 req/min | ⭐⭐⭐⭐ |
| LunarCrush | ⚠️ Freemium | 10 Credits/Tag | ⭐⭐⭐ |
| Santiment | ❌ $49+/mo | Nur verzögert | ⭐⭐⭐⭐ |
| Twitter/X | ❌ $100/mo | - | ⭐⭐⭐⭐⭐ |

---

## 7. Nächste Schritte

1. **Scanner-Script bauen** — Python-Script das:
   - DexScreener `/token-profiles/latest` pollt (neue Token)
   - DexScreener `/latest/dex/search` für Volume-Spikes nutzt
   - CoinGecko Trending checkt
   - GitHub-Aktivität für Top-Kandidaten prüft

2. **GitHub Personal Access Token** erstellen → Env-Variable setzen

3. **Reddit OAuth App** registrieren → für Sentiment

4. **Scoring-Pipeline** implementieren (siehe scanner-scoring.md)

5. **Alerting** — Telegram-Bot für High-Score Alerts
