# Crypto Scanner — Scoring System (0-100)

*Stand: 2026-02-12*

---

## Pipeline-Stufen

| Score | Stufe | Aktion |
|---|---|---|
| 0-25 | 🚫 **NO-GO** | Ignorieren, vermutlich Scam/Dead |
| 26-50 | 👀 **WATCHLIST** | Beobachten, noch nicht handeln |
| 51-75 | 🔍 **DEEP DIVE** | Detaillierte Analyse starten |
| 76-100 | 🎯 **SETUP** | Entry-Setup suchen, Position planen |

---

## Scoring-Kategorien (100 Punkte total)

### 1. Markt-Daten (30 Punkte) — via DexScreener

| Kriterium | Punkte | Logik |
|---|---|---|
| Liquidität | 0-8 | <$10k=0, $10k-50k=3, $50k-200k=5, $200k-1M=7, >$1M=8 |
| 24h Volume | 0-7 | <$5k=0, $5k-50k=3, $50k-500k=5, >$500k=7 |
| Buy/Sell Ratio | 0-5 | <0.5=0, 0.5-0.8=2, 0.8-1.2=3, 1.2-2.0=5 |
| Volume/MCap Ratio | 0-5 | <0.01=0, 0.01-0.1=2, 0.1-0.5=4, >0.5=5 |
| Token-Alter | 0-5 | <1h=1, 1-24h=3, 1-7d=5, 7-30d=4, >30d=2 |

### 2. Dev-Aktivität (25 Punkte) — via GitHub + CoinGecko

| Kriterium | Punkte | Logik |
|---|---|---|
| GitHub existiert | 0-5 | Kein Repo=0, Repo vorhanden=3, Verifiziert=5 |
| Stars | 0-5 | 0=0, 1-50=2, 50-200=3, 200-1000=4, >1000=5 |
| Commits (4 Wochen) | 0-5 | 0=0, 1-5=2, 5-20=3, 20-50=4, >50=5 |
| Contributors | 0-5 | 0-1=0, 2-3=2, 4-10=4, >10=5 |
| Letzter Commit | 0-5 | >90d=0, 30-90d=1, 7-30d=3, <7d=5 |

### 3. Social Signals (20 Punkte) — via CoinGecko + Reddit

| Kriterium | Punkte | Logik |
|---|---|---|
| Telegram Members | 0-5 | 0=0, <1k=1, 1-5k=3, 5-20k=4, >20k=5 |
| CG Watchlist Users | 0-5 | <1k=0, 1-10k=2, 10-50k=3, 50k-200k=4, >200k=5 |
| CG Sentiment (Up%) | 0-3 | <30%=0, 30-60%=1, 60-80%=2, >80%=3 |
| Reddit Activity | 0-4 | Kein Sub=0, <5 posts/48h=2, >5=3, >20=4 |
| CG Trending | 0-3 | Nicht trending=0, Trending=3 |

### 4. Tokenomics & Trust (15 Punkte) — via DexScreener + Manuelle Prüfung

| Kriterium | Punkte | Logik |
|---|---|---|
| DEX Vielfalt | 0-3 | 1 DEX=1, 2-3=2, >3=3 |
| Multi-Chain | 0-3 | 1 Chain=1, 2=2, >2=3 |
| DexScreener Boost | 0-3 | Kein Boost=0, Boost aktiv=2, Top Boost=3 |
| CTO Status | 0-3 | Kein CTO=1, CTO=3 (Community-driven) |
| Website/Socials | 0-3 | Keine=0, Website=1, +Twitter=2, +Docs=3 |

### 5. Momentum (10 Punkte) — via DexScreener

| Kriterium | Punkte | Logik |
|---|---|---|
| 5min Price Change | 0-2 | >+5%=2, >+2%=1, else=0 |
| 1h Price Change | 0-3 | >+10%=3, >+5%=2, >0%=1 |
| 24h Price Change | 0-3 | >+50%=3, >+20%=2, >+5%=1 |
| Txn Count (1h) | 0-2 | <10=0, 10-100=1, >100=2 |

---

## 🚨 SCAM-Detection — Instant NO-GO Kriterien

Wenn EINES dieser Kriterien zutrifft → **Score = 0, NO-GO**:

| Red Flag | Check-Methode |
|---|---|
| **Honeypot** | Buy möglich, Sell nicht (Simulation nötig) |
| **Liquidität < $1,000** | DexScreener liquidity.usd |
| **0 Sells in 24h** | DexScreener txns.h24.sells == 0 |
| **Token-Alter < 5 Min + >$100k MCap** | Verdacht auf Insider/Rug |
| **Kein Social Link** | DexScreener token-profiles hat 0 links |
| **Copy-Cat Name** | Name enthält "Elon", "Trump", bekannte Tokens |
| **Top 10 Wallets halten >80%** | On-Chain Check (Solscan/Etherscan) |
| **Mint Authority aktiv** | Creator kann neue Token minten |
| **Freeze Authority aktiv** | Creator kann Wallets einfrieren |

### Warnstufen (Score-Abzug)

| Yellow Flag | Abzug |
|---|---|
| Kein GitHub | -10 |
| Griffain-Typ (Closed Source + Hype) | -5 |
| Nur auf 1 DEX gelistet | -3 |
| Volume hauptsächlich von <5 Wallets | -10 |
| Team anonym + kein Track Record | -5 |

---

## Beispiel-Bewertung: Virtuals Protocol (VIRTUAL)

| Kategorie | Score | Details |
|---|---|---|
| Markt-Daten | 26/30 | Hohe Liquidity, starkes Volume |
| Dev-Aktivität | 8/25 | GitHub existiert aber wenig Aktivität |
| Social Signals | 14/20 | 23k Telegram, 98k Watchlist, 50% Sentiment |
| Tokenomics | 11/15 | Multi-Chain (ETH, Base, Solana), gute Docs |
| Momentum | 3/10 | Seitwärts aktuell |
| **TOTAL** | **62/100** | **🔍 DEEP DIVE** |

---

## Automation — Daten-Pipeline

```
1. SCAN: DexScreener token-profiles/latest → Neue Token
         DexScreener search → Volume Spikes
         CoinGecko trending → Trending Coins

2. FILTER: Instant NO-GO Checks (Honeypot, Low Liq, etc.)

3. SCORE: Für jeden Token der den Filter passiert:
          → DexScreener Pair Data (Markt + Momentum)
          → CoinGecko coin data (Social + Dev)
          → GitHub Search (Dev-Aktivität)
          
4. SORT: Nach Score absteigend

5. ALERT: Score > 50 → Telegram Notification
          Score > 75 → Urgent Alert mit Details
```
