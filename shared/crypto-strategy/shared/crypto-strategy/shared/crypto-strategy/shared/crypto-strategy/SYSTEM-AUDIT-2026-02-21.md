# 🔍 WEundMILO Crypto-System — Tiefenaudit
**Datum:** 2026-02-21 | **Auditor:** MILO AI | **Version:** 1.0

---

## 📋 EXECUTIVE SUMMARY

| Bereich | Status | Kritische Issues |
|---------|--------|-----------------|
| Datenbanken | ⚠️ WARNUNG | Doppelte DBs, leere Dateien, Sync-Lücken |
| Transaktions-Pipeline | ⚠️ WARNUNG | Holdings/TX Diskrepanzen bei XTZ/STX/HNT |
| Scanner-Infrastruktur | ✅ SOLIDE | 1.556 Quellen, gute Abdeckung |
| Dashboard-Export | ✅ OK | Funktional, kein Auto-Sync |
| Guardian-Reports | ✅ VERBESSERT | Post-STORJ-Fix implementiert |
| File-Ablagen | ⚠️ WARNUNG | Verwaiste DBs, fehlende Backups |
| API-Integrationen | ✅ OK | Keys vorhanden, Permissions korrekt |
| Data Consistency | 🔴 KRITISCH | 3 Diskrepanzen, Bilanz-DB out of sync |
| Security & Permissions | ✅ GUT | Dual-Approval, Mutex-Lock aktiv |
| Performance | ⚠️ MITTEL | Verwaiste Daten, kein Auto-Cleanup |

**Gesamtbewertung: 6.5/10** — Funktional, aber mit Datenintegritäts-Risiken die sofortige Aufmerksamkeit brauchen.

---

## 1. DATENBANKEN

### Current State
| Datenbank | Pfad | Größe | Tabellen | Records |
|-----------|------|-------|----------|---------|
| **portfolio.db** | shared/ | 164K | 6 (holdings, transactions, price_history, meta, watchlist, bilanz) | Holdings: 31, TX: 26, Prices: 1.110, Bilanz: 7 |
| **bilanz.db** | shared/ | 24K | 4 (einzahlungen, kaeufe, verkaeufe, saldo) | Einz: 5, Käufe: 13, Verk: 3, Saldo: 1 |
| **scanner.db** | crypto-strategy/ | 36K | 2 (coins, lessons) | Coins: 60, Lessons: 12 |
| **crypto.db** | shared/ | 0B | — | LEER |
| **crypto.db.bak** | shared/ | 172K | 7 (alt-System) | Holdings: 11 |
| **crypto-strategy/portfolio.db** | crypto-strategy/ | 0B | — | LEER |

### 🔴 Issues (Critical)
1. **crypto.db ist 0 Bytes** — Leere Datei, wahrscheinlich bei Migration zerstört. Backup (172K) existiert noch mit altem Schema (11 Holdings)
2. **crypto-strategy/portfolio.db ist 0 Bytes** — Komplett leer, Phantom-Datei
3. **Doppelte Bilanz-Daten** — `portfolio.db` hat eigene `bilanz`-Tabelle UND `bilanz.db` existiert separat → Sync-Risiko

### Recommended Improvements
- [ ] **CRITICAL:** `crypto.db` und `crypto-strategy/portfolio.db` löschen oder archivieren (→ `trash`)
- [ ] Bilanz-Daten konsolidieren: Eine Source of Truth definieren
- [ ] Automatisches tägliches Backup-Script für portfolio.db und bilanz.db
- **Priority: 🔴 Critical**

---

## 2. TRANSAKTIONS-PIPELINE

### Current State
- 26 Transaktionen erfasst (BUY/SELL/DEPOSIT)
- Trade Execution Pipeline (`trade-execution-pipeline.mjs`) mit atomaren SQLite-Transaktionen
- Post-Trade-Reconciliation existiert (`post-trade-reconciliation.mjs`)
- Trade-Lock Mechanismus (`trade-lock.mjs`)

### ⚠️ Issues (High)
1. **XTZ Holdings/TX Diskrepanz: +52.23 Coins**
   - Holdings: 1.800,42 XTZ
   - TX-Sum (BUY): 1.748,19 XTZ (250 + 1.498 aus 2 Käufen)
   - → 52.23 XTZ nicht durch Transaktionen gedeckt
2. **STX Holdings/TX Diskrepanz: +111.05 Coins**
   - Holdings: 2.364,99 STX | TX: 2.253,94 STX
3. **HNT Holdings/TX Diskrepanz: +27.09 Coins**
   - Holdings: 613,56 HNT | TX: 586,47 HNT
4. **XTZ Debug-Trade (100$)** als echte Transaktion erfasst — "API Debug Test Trade" in Produktion

### Root Cause
Die Holdings wurden vermutlich manuell mit dem tatsächlichen MEXC-Balance aktualisiert (inkl. Trading-Rewards/Fills über Limit), aber die Transaktions-Tabelle spiegelt nur die Initial-Orders.

### Recommended Improvements
- [ ] **HIGH:** Ausgleichs-TX für XTZ (+52.23), STX (+111.05), HNT (+27.09) eintragen als "FILL_ADJUSTMENT"
- [ ] Debug-Trades mit Flag markieren oder aus Produktion entfernen
- [ ] Automatische Post-Trade-Reconciliation gegen MEXC API
- **Priority: ⚠️ High**

---

## 3. SCANNER-INFRASTRUKTUR

### Current State
| Quelle | Anzahl | Intervall |
|--------|--------|-----------|
| Reddit Subreddits | 78 | 5 min |
| Telegram Channels | 346 | — |
| X/Twitter Accounts | 1.100 | — |
| YouTube Channels | 32 | — |
| DEX Monitoring | aktiv | 2 min |
| **Total Sources** | **1.556** | — |

- Alert Threshold: 7 Mentions
- Scanner DB: 60 gescannte Coins, 12 Lessons Learned
- Umfangreiche KOL-Audit-Infrastruktur (6+ Audit-Rounds)

### ✅ Positiv
- Massive Multi-Platform-Abdeckung
- Strukturiertes Scoring-System (result: no-go/watchlist/deep-dive/setup/bought/rejected)
- Lessons-Learned-System direkt in DB integriert

### ⚠️ Issues (Medium)
1. **1.100 X-Accounts** — Potentielles Rate-Limiting-Risiko, erfordert Session-Management
2. **x-cookies.json** im Repo — Session-Daten als Flat-File (Rotation nötig)
3. **Kein automatisierter Lauf** — Scanner scheint manuell getriggert zu werden
4. **scanner.log** nicht rotiert — kann wachsen

### Recommended Improvements
- [ ] X-Cookie-Rotation automatisieren
- [ ] Scanner als Cron-Job / dauerhaften Service einrichten
- [ ] Log-Rotation für scanner.log
- **Priority: ⚠️ Medium**

---

## 4. DASHBOARD-EXPORT

### Current State
- Crypto-Dashboard (`crypto-dashboard/`) mit Git-Tracking
- Masterplan Cards (6 Seiten), Bilanz-Views, Portfolio-Views
- Export-Scripts: `export-data.sh`, `export-data-enhanced.sh`
- Screenshot-Pipeline: 14+ `.mjs` Screenshot-Scripts mit Playwright
- `data.json` + `coin_details.json` als Daten-Layer

### ✅ Positiv
- Standardisiertes Design-System (1080px, Inter Font, Dark Theme)
- Umfangreiche HTML-Templates für verschiedene Ansichten
- Git-tracked für Versionshistorie

### ⚠️ Issues (Low)
1. **Kein Auto-Sync** zwischen Dashboard-Daten und portfolio.db
2. **data.json** könnte stale sein ohne automatisches Update
3. **Viele Screenshot-Scripts** mit ähnlicher Logik → DRY-Violation

### Recommended Improvements
- [ ] Auto-Export nach jedem Trade triggern
- [ ] Screenshot-Scripts konsolidieren (1 generisches Script mit Parametern)
- **Priority: 🟡 Low**

---

## 5. GUARDIAN-REPORTS

### Current State
- `guardian-security-patch.mjs` — Post-STORJ-Incident Fix
- **VERBOTENE Aktionen definiert:** AUTO_BUY, AUTO_SELL, AUTO_REBALANCE, POSITION_CORRECTION
- Guardian ist READ-ONLY: Alerts senden, KEIN Auto-Trading
- Position-Mismatch-Detection mit 0.01 Threshold

### ✅ Positiv
- Klare Lehre aus STORJ-Incident gezogen und implementiert
- Dual-Approval-Pflicht durchgesetzt
- Alert-Only-Architektur korrekt

### ⚠️ Issues (Low)
1. Guardian läuft nicht als dauerhafter Service
2. Keine Timing-basierte Alerts (z.B. "Price dropped 20% in 1h")
3. Kein Alert-History-Log in der DB

### Recommended Improvements
- [ ] Guardian-Alerts als eigene DB-Tabelle loggen
- [ ] Scheduled Guardian-Runs (alle 15 min)
- **Priority: 🟡 Low**

---

## 6. FILE-ABLAGEN

### Current State
```
shared/
├── portfolio.db (HAUPTDATENBANK)
├── bilanz.db (FINANZ-BILANZ)
├── crypto.db (LEER!) ← 🔴
├── crypto.db.bak (ALT-BACKUP)
├── crypto-strategy/ (Strategie-Docs, Scanner DB, Templates)
├── crypto-scanner/ (Scanner-Code, KOL-Audits, Config)
├── crypto-dashboard/ (Web-Dashboard, Git-tracked)
├── *.mjs (Trading-Scripts auf Top-Level)
└── private/mexc-api.json (API Keys)
```

### ⚠️ Issues (Medium)
1. **Trading-Scripts auf Top-Level** (`enhanced-trading-process.mjs`, `trading-security.mjs`, etc.) — sollten in crypto-strategy/ oder eigenen Ordner
2. **Verwaiste Dateien:** `crypto.db` (0B), `crypto-strategy/portfolio.db` (0B)
3. **Kein systematisches Backup** — nur 1x `crypto.db.bak` existiert
4. **crypto-geheimtipps.csv** auf Top-Level — gehört in crypto-strategy/

### Recommended Improvements
- [ ] Trading-Scripts nach `crypto-strategy/scripts/` verschieben
- [ ] Verwaiste 0B-Dateien entfernen
- [ ] Tägliches Backup-Script: `cp portfolio.db portfolio.db.$(date +%Y%m%d)`
- [ ] File-Struktur-README erstellen
- **Priority: ⚠️ Medium**

---

## 7. API-INTEGRATIONEN

### Current State
| API | Status | Keys | Permissions |
|-----|--------|------|-------------|
| MEXC | ✅ Aktiv | `/private/mexc-api.json` | read + spot_trade (NO withdraw) |
| Coinpaprika | ✅ Aktiv | Über Scanner | Price Data |
| DexScreener | ✅ Aktiv | Über Scanner | DEX Monitoring |
| Reddit | ✅ Aktiv | Über Scanner | Subreddit Scanning |
| X/Twitter | ⚠️ Cookie-Auth | `x-cookies.json` | Scraping |
| YouTube | ✅ Aktiv | Über Scanner | Channel Monitoring |

### ✅ Positiv
- MEXC Keys korrekt eingeschränkt (kein Withdraw!)
- Key-Expiry tracked (2026-05-19, Reminder 12. Mai)
- Dual-Approval für Trades

### ⚠️ Issues (Medium)
1. **X/Twitter über Cookie-Auth** — fragil, kann jederzeit brechen
2. **Keine API-Call-Rate-Tracking** — bei 1.100 X-Accounts relevant

### Recommended Improvements
- [ ] X-API Upgrade auf offizielle API wenn Budget erlaubt
- [ ] Rate-Limit-Tracking implementieren
- **Priority: ⚠️ Medium**

---

## 8. DATA CONSISTENCY 🔴

### Cross-Validation Results

#### A) Holdings ↔ Transactions (portfolio.db intern)
| Coin | Holdings | TX-Sum | Diskrepanz | Status |
|------|----------|--------|------------|--------|
| XTZ | 1.800,42 | 1.748,19 | **+52,23** | 🔴 |
| STX | 2.364,99 | 2.253,94 | **+111,05** | 🔴 |
| HNT | 613,56 | 586,47 | **+27,09** | 🔴 |
| STORJ | 12.674,53 | 12.674,53 | 0,00 | ✅ |
| Andere 11 | — | — | 0,00 | ✅ |

#### B) portfolio.db bilanz ↔ bilanz.db einzahlungen
| Feld | portfolio.db | bilanz.db | Match |
|------|-------------|-----------|-------|
| Chris INVEST | 5.000€ | 5.000€ | ✅ |
| Chris DEPOSIT | **2.500€** | **500€** | 🔴 MISMATCH |
| Juri EQUIPMENT | 791€ | 791€ | ✅ |
| Juri AUSGLEICH | 2.350€ | 2.350€ | ✅ |
| Juri DEPOSIT | **2.000€** | **fehlt** | 🔴 MISMATCH |

**bilanz.db fehlen die Feb-19 SEPA-Deposits (Chris 2.000€ + Juri 2.000€)!**

#### C) FHE Status Inkonsistenz
- bilanz.db → FHE verkauft (verkaeufe-Tabelle: Verlust -87,33$)
- portfolio.db → FHE Status = **"watchlist"** statt **"sold"**
- FHE amount in holdings: 7.496,18 (!=  bilanz.db amount: 7.100,0)

#### D) USDT Balance
- meta.usdt_free: **1.508,28 USDT**
- meta.last_update: 2026-02-19 (2 Tage alt!)
- Letzte Trades (XTZ, STX, HNT, IMX) am 2026-02-20 → USDT müsste niedriger sein

### 🔴 Issues (Critical)
1. **3 Holdings-Diskrepanzen** (XTZ/STX/HNT) — ca. 190 Coins-Differenz
2. **bilanz.db 2 Tage hinter portfolio.db** — Feb-19 Deposits fehlen
3. **FHE Status falsch** in portfolio.db (watchlist statt sold)
4. **USDT-Balance potentiell stale** nach Feb-20 Trades

### Recommended Improvements
- [ ] **CRITICAL:** Holdings für XTZ/STX/HNT mit Adjustment-TX synchronisieren
- [ ] **CRITICAL:** bilanz.db mit Feb-19 Deposits aktualisieren
- [ ] **CRITICAL:** FHE Status auf "sold" korrigieren
- [ ] USDT-Balance nach jedem Trade automatisch aktualisieren
- [ ] Täglicher Consistency-Check als Cron-Job
- **Priority: 🔴 Critical**

---

## 9. SECURITY & PERMISSIONS

### Current State
- ✅ Dual-Approval (Chris + Juri) für alle Trades
- ✅ Symbol-Mutex-Lock gegen Double-Orders
- ✅ Idempotency-Keys für Order-Deduplication
- ✅ Confirm-ID Single-Use Validation
- ✅ 15min Cooldown zwischen Orders
- ✅ MEXC Keys ohne Withdraw-Permission
- ✅ Guardian ist READ-ONLY (Post-STORJ-Fix)
- ✅ Private Keys in `/private/` separiert

### ⚠️ Issues (Medium)
1. **x-cookies.json** enthält Session-Daten im Repo-Root — sollte in `/private/`
2. **mexc-api.json Permissions:** `644` (world-readable) — sollte `600` sein
3. **Security-Guards nur im Code** — keine Runtime-Enforcement (Process kann Guards umgehen)
4. **Kein Audit-Trail** — Trading-Security-Events werden nicht persistent geloggt

### Recommended Improvements
- [ ] `chmod 600 /private/mexc-api.json`
- [ ] x-cookies.json nach `/private/` verschieben
- [ ] Security-Event-Log in DB (wer hat wann was approved)
- **Priority: ⚠️ Medium**

---

## 10. PERFORMANCE & BOTTLENECKS

### Current State
- **price_history:** 1.110 Records (26 Coins × ~43 Snapshots) — kein Problem
- **scanner.db:** 60 Coins — minimal
- **Portfolio.db:** 164K — winzig
- **Scanner Config:** 1.556 Quellen — Hauptlast

### ⚠️ Issues (Medium)
1. **Kein price_history Cleanup** — wächst unbegrenzt (aktuell harmlos, langfristig relevant)
2. **1.100 X-Accounts Scraping** — potentieller Bottleneck bei sequentiellem Abruf
3. **Screenshot-Pipeline:** 14 separate .mjs Scripts statt 1 generisches → Maintenance-Overhead
4. **Kein Connection-Pooling** für SQLite (bei concurrent access)

### Recommended Improvements
- [ ] price_history: Retention Policy (z.B. 90 Tage Detail, danach Daily-Aggregation)
- [ ] X-Scraping parallelisieren mit Rate-Limit-Guard
- [ ] Screenshot-Scripts konsolidieren
- **Priority: 🟡 Low**

---

## 🎯 ACTION ITEMS — Priorisiert

### 🔴 CRITICAL (Sofort)
1. **FIX:** FHE Status → `sold` in portfolio.db
2. **FIX:** bilanz.db — Feb-19 Deposits nachtragen (Chris 2.000€, Juri 2.000€)
3. **FIX:** XTZ/STX/HNT Holdings-Diskrepanzen mit Adjustment-TX auflösen
4. **CLEANUP:** Leere DBs entfernen (`crypto.db`, `crypto-strategy/portfolio.db`)

### ⚠️ HIGH (Diese Woche)
1. Automatischen Consistency-Check implementieren (DB ↔ MEXC)
2. USDT-Balance nach jedem Trade auto-updaten
3. Tägliches DB-Backup-Script einrichten

### 🟡 MEDIUM (Nächste 2 Wochen)
1. File-Struktur aufräumen (Scripts gruppieren)
2. Security: Permissions fixen, x-cookies verschieben
3. Security-Event-Log in DB
4. Scanner als dauerhaften Service einrichten

### 🟢 LOW (Backlog)
1. Screenshot-Scripts konsolidieren
2. price_history Retention Policy
3. Guardian Alert-History in DB
4. Dashboard Auto-Sync nach Trades

---

*Audit abgeschlossen: 2026-02-21 01:18 EST*
*Nächster Audit empfohlen: 2026-03-01*
