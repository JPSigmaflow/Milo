# Full Audit Report — 2026-02-18

## Summary

| Platform | Vorher | Geprüft | Aktiv | Entfernt | Nicht geprüft |
|----------|--------|---------|-------|----------|---------------|
| YouTube | 34 | 34 | 9 | 25 | 0 |
| Instagram | 44 | 44 | 26 | 0 | 18 (login wall) |
| Reddit | 81 | 81 | 62 | 3 | 16 (rate-limited) |
| Telegram | 271 | 271 | 245 | 26 | 0 |
| X/Twitter | 1118 | 9 | 6 | 3 | 1109 (rate-limited) |
| **TOTAL** | **1548** | **439** | **348** | **57** | **1143** |

## Entfernte Accounts

### YouTube (25 entfernt — kein RSS Feed/keine Einträge)
- Alex Becker (UCKQvGU-qtjGlArsgMu7Bcrg)
- Anthony Pompliano (UCQrbbJKCRbsTCaK9xf34sZQ)
- Benjamin Cowen (UCRvqjQPSeaWn-uEx-w0XOIg)
- BitBoy Crypto (UCjemQfjaXAzA-95RKoy9n_g)
- Brian Jung (UCROBQsU_ABJQ2wBhdT_aBfQ)
- Coin Bureau Clips (UCB_HBJoETFHCIjDXBO2GGWA)
- Crypto Banter (UCN9Nj4tjXbVTLYWN0EKly_Q)
- Crypto Casey (UCuSGhbOAgNR1KQMz2-yz_CA)
- Crypto Daily (UC67AEEecqFEc92nVEqBreiA)
- Crypto Jebb (UCQglaVhGOsHop6McJKVYH_A)
- Crypto Mobster (UC6F5vfcNu-R3OGR9FXNwrig)
- CryptosRUs (UCI7M65p3A-D3P4v5qW8POxQ)
- DataDash (UCCatR7nWbYrkVXdxXb4cGXw)
- Digital Asset News (UCJgHxpqfitLFB2eJKMGMhiA)
- Finematics (UCh1ob28ceGdqohUnR7vBACA)
- InvestAnswers (UClgJyzwGs-GyaNxUHcLZrkg)
- JRNY Crypto (UC8s-JMdZEUHkXpGOPQzIC2g)
- Miles Deutscher (UCVVX-7tHff75fRAEEEnZiAQ)
- Paul Barron Network (UCkiJFEfm3HmrEZMwzG5CYg)
- Raoul Pal / Real Vision (UCBH5VZE_Y4F3CMcPIzPEB5A)
- Sheldon Evans (UCkU60bz7Uk55HiiRH5Nqe9A)
- Taiki Maeda (UCrDe0s5BlDAMr_dJzr1QJSA)
- The Moon Carl (UCc4Rz_T9Sb1w5SVhGoCbDyw)
- Unchained Podcast (UCWiiMnsnw5Isc2PP1wFe1BQ)
- Whiteboard Crypto (UCsYYksPHiGqXHPoHI-fm5sg)

### Telegram (26 entfernt — "not available" / kein Preview)
arbitrum_official, avalanche_avax, azuki_official, base_channel, birdeye_so, blocktempo, chainnewscn, crypto_dotcom, decrypt_daily, delphi_digital, dimo_network, doge_official, EigenLayerChannel, electric_capital, fenbushi_capital, huobi_cn, HyperliquidX, illuvium_official, marsfinance, messaricrypto, ocean_protocol, paradigm_official, pudgy_penguins, shiba_official, virtual_protocol, waterdrip_capital

### Reddit (3 entfernt — banned/private/404)
AirdropAlert, Avalanche, CryptoGemDiscovery

### X/Twitter (3 entfernt — confirmed empty profile page)
0x0xfeng, 0xC_Explorer, 0xHamz

### Instagram (0 entfernt)
Kein Account definitiv tot. 18 Accounts konnten nicht geprüft werden (Instagram Login-Wall nach ~26 Requests).

## Nicht geprüft (für nächsten Audit)

### Reddit (16 — Rate-Limited ab Subreddit #65)
pennycryptocurrency, SolanaMemecoin, SSBcrackheads, Stacks, Stellar, Sui, technicalanalysis, TechnicalAnalysis_Crypto, Tezos, Toncoin, UniSwap, VeChain, wallstreetbetscrypto, XRP, yield_farming, zkSync

### Instagram (18 — Login-Wall)
felix_hartmann, thecryptolark, ivanontech, cryptofinally, coinstats, thecoinrise, cryptostache, scottmelker, crypto_daily, cryptoland_, polkadotnetwork, thedefiant.io, cryptoworldjosh, krypticrooks, tombilyeu, nftcollector, cryptomason, cryptobanter

### X/Twitter (1109 — Rate-Limited)
Twitter Syndication API hat nach ~9 Requests Rate-Limiting aktiviert (429). 1109 von 1118 Accounts konnten nicht geprüft werden. Für nächsten Audit: Alternative API oder verteilte Requests über mehrere IPs/Sessions nötig.

## YouTube — Verbleibende aktive Kanäle (9)
- Altcoin Daily
- Bankless
- Boxmining
- Coin Bureau
- Dapp University
- EllioTrades
- Ivan on Tech
- Lark Davis
- The Defiant

## Hinweise
- **YouTube "dead"**: Die RSS-Feed-Methode zeigt keine `<entry>` Elemente. Manche Kanäle haben möglicherweise RSS deaktiviert, existieren aber noch. Überprüfung via Browser empfohlen für wichtige Kanäle.
- **Telegram**: Zuverlässigste Prüfung — t.me/s/{channel} Preview ist ein klarer Indikator.
- **X/Twitter**: Praktisch nicht geprüft wegen aggressivem Rate-Limiting. Benötigt authentifizierte API oder alternatives Tool.
- **Config.json** wurde aktualisiert: 1548 → 1491 Quellen (57 entfernt).
