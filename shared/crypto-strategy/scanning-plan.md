# 🔍 Crypto Scanner — Profil & Quellen-Liste

## Erstellt: 09.02.2026

---

## 📡 X/Twitter — Top Crypto Influencer (Tier 1: Must-Watch)

### Whale Alerts & Data
1. @whale_alert — Große Wallet-Bewegungen
2. @lookonchain — On-chain Analyse, Whale Tracking
3. @EmberCN — Wallet-Tracking, Token-Flows

### Alpha Callers & Influencer
4. @CryptoCobain — OG Trader, Market Calls
5. @GCRClassic — Legendary Trader
6. @HsakaTrades — Derivate & Spot Calls
7. @CryptoKaleo — Altcoin Calls
8. @AltcoinSherpa — Altcoin Analyse
9. @CryptoDonAlt — Macro + Altcoins
10. @inversebrah — Contrarian Calls, Memes

### Memecoin & New Token Specialists
11. @MustStopMurad — Memecoin Alpha
12. @blaboratory — Early Token Discovery
13. @0xSun_Crypto — Solana Token Sniper
14. @DegenSpartan — DeFi/Token Alpha

### AI & Narrative Traders
15. @ai16zdao — AI Token Ökosystem
16. @virtikitten — Virtuals Protocol Updates
17. @shlomokretzmer — AI Agent Narrative

### News & Macro
18. @tier10k — Breaking Crypto News
19. @WatcherGuru — Schnelle News
20. @CoinDesk — Mainstream Crypto News
21. @TheBlock__ — Institutional News
22. @zaborsky — Macro + Crypto

### Politische Signale (Trump etc.)
23. @realDonaldTrump — Posts die Memecoins triggern
24. @elikitten — Elon-Adjacent
25. @cb_doge — Doge/Meme Narrative

---

## 📱 Telegram Gruppen

### Alpha & Signals
1. Crypto Inner Circle (invite-only)
2. DeFi Alpha
3. Memecoin Hunters
4. Solana Alpha Chat

### News & Announcements
5. CoinGecko Announcements
6. Binance Announcements
7. MEXC New Listings
8. KuCoin Announcements

### Specific Ecosystems (relevant für unser Portfolio)
9. Kaspa Community
10. Virtuals Protocol Chat
11. Rain Protocol Official
12. Raydium Community

---

## 🌐 Reddit Subreddits (JSON API — kostenlos)

1. r/CryptoMoonShots — Neue Token, frühe Calls
2. r/CryptoCurrency — General Discussion
3. r/SatoshiStreetBets — Meme/Pump Diskussionen
4. r/solana — Solana Ecosystem
5. r/defi — DeFi News

---

## 🔑 Keywords für Filter

### Token Launch Signals
- "new token", "just launched", "stealth launch", "fair launch"
- "presale", "ICO", "IDO", "airdrop"
- "listing", "CEX listing", "Binance listing"

### Hype Triggers
- "Trump", "Elon", "Musk"
- "penguin", "pepe", "doge" (Meme-Trigger)
- "AI agent", "virtual", "autonomous"
- "1000x", "moonshot", "gem"

### Risk Alerts
- "rug", "scam", "honeypot", "hack"
- "exploit", "drained", "compromised"

### Portfolio-Specific
- "RAIN", "Kaspa", "KAS", "Raydium", "RAY"
- "VIRTUAL", "Virtuals", "Griffain"
- "Zero1", "DEAI", "Luna by Virtuals"

---

## ⚙️ Technisches Setup

### Stufe 1: Feed Collection (0 Tokens)
- Cron alle 15 Min
- X via RSS Bridge (Nitter) oder Twitter API
- Reddit via .json Endpoint
- Telegram via Bot Forwarding
- CoinGecko /coins/list für neue Listings

### Stufe 2: Keyword Filter (0 Tokens)
- Lokales Node.js Script
- Pattern Matching gegen Keyword-Liste
- Output: gefilterte Posts mit Score

### Stufe 3: AI Bewertung (minimal Tokens)
- Nur Treffer aus Stufe 2
- Bewertung: Relevanz (1-10), Urgency, Action Required
- Push an WEundMILO Gruppe bei Score > 7

### Geschätzte Kosten
- API: $0 (kostenlose Endpoints)
- Tokens: ~$0.50-1.50/Tag (je nach Treffervolumen)
- Infrastruktur: Läuft auf dem Mac Mini
