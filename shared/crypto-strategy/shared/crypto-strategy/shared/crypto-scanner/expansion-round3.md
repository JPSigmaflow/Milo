# KOL Netzwerk-Expansion Runde 3 — Bericht
**Datum:** 2026-02-18  
**Methode:** Following-Analyse der Top-10 KOLs via X GraphQL API

## Zusammenfassung

| Metrik | Vorher | Nachher | Neu |
|--------|--------|---------|-----|
| X/Twitter Accounts | 188 | 219 | +31 |
| Telegram Kanäle | 101 | 101 | 0 |
| Reddit Subs | 33 | 33 | 0 |

## Methodik

Following-Listen von 10 Top-KOLs abgefragt (je 70 Accounts, API-Limit):
- @MilesDeutscher (650K), @zachxbt (947K), @blknoiz06 (793K), @cobie (887K)
- @DefiIgnas (159K), @gainzy222 (326K), @SOLBigBrain (308K), @CryptoKaleo (731K)
- @DonAlt (711K), @AltcoinSherpa (261K)

**Overlap-Analyse:** Accounts die von 2+ KOLs gefolgt werden = starkes Netzwerk-Signal.

## Netzwerk-Karte: Top Neue Accounts (sortiert nach KOL-Overlap)

### 6 KOLs folgen (🔥🔥🔥)
| Account | Follower | Gefolgt von |
|---------|----------|-------------|
| @Tradermayne | 559K | zachxbt, cobie, gainzy222, CryptoKaleo, DonAlt, AltcoinSherpa |
| @RookieXBT | 500K | zachxbt, cobie, gainzy222, CryptoKaleo, DonAlt, AltcoinSherpa |

### 5 KOLs folgen (🔥🔥)
| Account | Follower | Gefolgt von |
|---------|----------|-------------|
| @TheFlowHorse | 279K | zachxbt, cobie, gainzy222, SOLBigBrain, CryptoKaleo |
| @pierre_crypt0 | 207K | zachxbt, cobie, gainzy222, DonAlt, AltcoinSherpa |
| @ByzGeneral | 243K | cobie, gainzy222, CryptoKaleo, DonAlt, AltcoinSherpa |

### 4 KOLs folgen (🔥)
| Account | Follower | Gefolgt von |
|---------|----------|-------------|
| @CL207 | 271K | zachxbt, cobie, gainzy222, DonAlt |
| @DegenSpartan | 272K | zachxbt, cobie, gainzy222, DonAlt |
| @ledgerstatus | 247K | zachxbt, cobie, gainzy222, DonAlt |

### 3 KOLs folgen
| Account | Follower | Gefolgt von |
|---------|----------|-------------|
| @Tree_of_Alpha | 245K | zachxbt, cobie, DonAlt |
| @AltcoinPsycho | 520K | gainzy222, CryptoKaleo, DonAlt |
| @Ninjascalp | 261K | gainzy222, CryptoKaleo, AltcoinSherpa |

### 2 KOLs folgen
| Account | Follower | Gefolgt von |
|---------|----------|-------------|
| @CryptoWizardd | 815K | CryptoKaleo, AltcoinSherpa |
| @cryptocevo | 393K | CryptoKaleo, AltcoinSherpa |
| @notthreadguy | 355K | cobie, DonAlt |
| @coinmamba | 319K | CryptoKaleo, DonAlt |
| @MattPRD | 253K | zachxbt, gainzy222 |
| @star_okx | 217K | gainzy222, CryptoKaleo |
| @abetrade | 197K | zachxbt, DonAlt |
| @jimtalbot | 189K | cobie, DonAlt |
| @TheDeFinvestor | 162K | MilesDeutscher, DefiIgnas |
| @satsdart | 160K | zachxbt, DonAlt |
| @crypto_condom | 136K | DefiIgnas, DonAlt |
| @bitcoinpanda69 | 106K | zachxbt, gainzy222 |
| @patfscott | 97K | MilesDeutscher, DefiIgnas |
| @0xThoor | 95K | MilesDeutscher, DefiIgnas |
| @jukan05 | 71K | cobie, AltcoinSherpa |
| @0xDeployer | 39K | blknoiz06, CryptoKaleo |
| @Jackkk | 30K | MilesDeutscher, AltcoinSherpa |
| @ezcontra | 19K | DonAlt, AltcoinSherpa |

## Retestete Accounts (von Runde 2)

| Account | Follower | Status | Aktion |
|---------|----------|--------|--------|
| @punk9277 | 66K | ✅ OK | Hinzugefügt |
| @PhyrexNi | 380K | ✅ OK | Hinzugefügt |
| @HashKeyGroup | 108K | ✅ OK | Hinzugefügt |
| @0xWizard | 9K | ✅ OK aber <10K | Nicht hinzugefügt |
| @BoxMining | — | Bereits im Scanner | — |
| @IOSG_VC | — | ❌ API Fehler | Nicht hinzugefügt |
| @FenbushiCapital | — | ❌ API Fehler | Nicht hinzugefügt |

## Ausgeschlossene Accounts (nicht crypto-relevant)

- @claudeai (445K) — AI-Bot-Account, kein KOL
- @hooeem (146K) — Marketing/Income, nicht primär Crypto
- @thedankoe (861K) — Self-help/Creator, kein Crypto-Fokus
- @remusofmars (24K) — Attention economics
- @Yeah_Dave (16K) — Space/Energy/Defense
- @CryptoMikli (12K) — Zu klein, nur Clipping

## API-Limitierungen

- Following-API gibt max 70 Accounts pro Aufruf zurück (neueste zuerst)
- KOLs mit >1000 Following (z.B. blknoiz06: 8813) sind damit unterrepräsentiert
- Keine Rate-Limiting aufgetreten ✅
- Für tiefere Analyse: Pagination mit Cursor nötig (count=200 + cursor)

## Nächste Schritte (Runde 4)

1. **Pagination** — Mehr als 70 Following pro KOL holen
2. **Zweite Ebene** — Following der neu gefundenen Top-Accounts analysieren
3. **Telegram-Expansion** — Telegram-Kanäle der neuen Accounts finden
4. **IOSG_VC & FenbushiCapital** — Erneut testen (API-Fehler waren vermutlich temporär)
