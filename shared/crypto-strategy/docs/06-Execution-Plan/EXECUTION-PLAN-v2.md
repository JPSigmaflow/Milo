# 🏗️ MILO CRYPTO SYSTEM v2.0 — EXECUTION PLAN

> **Stand:** 11. Februar 2026 | **Portfolio:** ~$3.509 | **Team:** Juri, Chris, Milo
> **Infrastruktur:** Mac Mini 24/7, Telegram Bot, Coinpaprika API

---

## 1) SOCRATIC START — Interne Klärung

| # | Frage | Antwort |
|---|-------|---------|
| 1 | **Primäres Ziel** | Kapitalerhalt + moderate Rendite (15-30% p.a. Ziel). Kein Hype-Trading. |
| 2 | **Max Drawdown** | **-20% Portfolio** ($701). Bei Erreichen: Full Stop, Review, keine neuen Trades. |
| 3 | **Zeithorizonte** | Swing (2-14 Tage) + Position (2-12 Wochen). **KEIN Intraday.** |
| 4 | **Erlaubte Märkte** | **NUR Spot.** Keine Perps, Options, Leverage. Nur MEXC + Raydium DEX. |
| 5 | **Baseline-Kriterien** | Honeypot-Check ✅ · Liquidity >$50k ✅ · Sell Tax <5% ✅ · LP locked ✅ · Multi-Source-Bestätigung ✅ · Button-Confirm vor Trade ✅ |

---

## 2) SYSTEM-ARCHITEKTUR v2.0

### Modul A — Thesis & Universum (Filter)

**Universe-Regeln:**

| Kriterium | Minimum | Quelle |
|-----------|---------|--------|
| Marktkapitalisierung | >$1M | Coinpaprika, CoinGecko |
| 24h Volumen | >$50k | Coinpaprika |
| Listing-Alter | >30 Tage | Coinpaprika |
| Liquidity (DEX) | >$50k TVL | DexScreener, Raydium |
| Community | >1.000 Holder | On-Chain Explorer |
| Konzept | Schlüssig, kein reiner Meme | Whitepaper, Docs |

**Ausschlussregeln (Hard No):**

- ❌ Rebase/Elastic-Supply Tokens
- ❌ Sell Tax >5%
- ❌ Anonymes Team ohne Track Record
- ❌ LP nicht gelockt / <6 Monate
- ❌ Honeypot-Check failed
- ❌ Reine Meme-Coins ohne Utility
- ❌ Tokens mit <30 Tagen Listing-Alter

**Datenquellen:**

| Typ | Quellen |
|-----|---------|
| Preis/Volumen | Coinpaprika API, CoinGecko |
| DEX-Daten | **DexScreener App** 📱 (primär), Raydium, Birdeye |
| On-Chain | Solscan, Etherscan |
| Social | Twitter/X, Discord, Telegram |
| Safety | RugCheck, TokenSniffer, GoPlus |

**Kern-Tools (Pflicht):**

| Tool | Typ | Zweck |
|------|-----|-------|
| **DexScreener** 📱 | App (iOS/Android) + Web | Live-Charts, neue Pools, Volume-Spikes, Liquidity-Check, Token-Screener, Watchlist, Preis-Alerts |
| **Phantom Wallet** 👻 | App (iOS/Android) + Browser Extension | Primäre Solana-Wallet für On-Chain-Trades, Token-Swaps via Jupiter, Portfolio-Übersicht, Hardware-Wallet-Anbindung (Ledger) |
| **MEXC** | App + Web | CEX-Trading für gelistete Coins, Spot-Orders, Portfolio-Management |

**DexScreener im Workflow:**
- **Discovery:** Neue Pools & Trending Tokens filtern (MC, Vol, Age, Liquidity)
- **Triage:** Instant Liquidity-Check, Holder-Verteilung, LP-Status
- **Monitoring:** Preis-Alerts auf SL/TP-Levels, Volume-Anomalien
- **Watchlist:** Alle Kandidaten als DexScreener Watchlist pflegen

**Phantom Wallet im Workflow:**
- **Execution:** Direkte Swaps via integriertem Jupiter-Aggregator (beste Route)
- **Sicherheit:** Ledger-Anbindung für Hardware-Signatur bei größeren Trades
- **Monitoring:** Portfolio-Übersicht aller Solana-Tokens (RAY etc.)
- **3-Tier Wallet-Setup:**
  - Tier 1 (Cold): Ledger Nano X → 80% Holdings
  - Tier 2 (Warm): Phantom + Ledger-Signatur → 15% Trading
  - Tier 3 (Hot): Phantom Burner-Wallet → 5% Tests

---

### Modul B — Pipeline (Idee → Trade)

| Stufe | Name | Beschreibung | Dauer | Gate |
|-------|------|-------------|-------|------|
| 1 | **Discovery** | Quellen scannen: Twitter, Aggregatoren, Coinpaprika Movers | 10 min/Tag | Mindestens 1 Kriterium aus Universe-Filter |
| 2 | **Triage** | Schnell-Check: MC, Volumen, LP, Sell Tax, Honeypot | 5 min/Coin | Alle Baseline-Kriterien bestanden |
| 3 | **Deep-Dive** | Whitepaper, Tokenomics, Team, Community, On-Chain Flows | 30-60 min | Score ≥7/10 auf Scorecard |
| 4 | **Setup** | Playbook wählen, Entry/SL/TP definieren, R:R berechnen | 15 min | R:R ≥ 2:1, Decision Gate bestanden |
| 5 | **Execution** | Order setzen via MEXC/Raydium, Button-Confirm im Bot | 5 min | Bestätigung durch Juri ODER Chris |
| 6 | **Monitoring** | Täglicher Check: Preis vs. SL/TP, News, On-Chain | 5 min/Tag | SL/TP nicht erreicht |
| 7 | **Review** | Trade schließen, Journal-Eintrag, Lessons Learned | 15 min | Journal-Eintrag vollständig |

---

### Modul C — Risk Engine (NICHT VERHANDELBAR)

| Regel | Wert | Konsequenz bei Verstoß |
|-------|------|----------------------|
| Max pro Position | **5% Portfolio** (~$175) | Trade wird nicht ausgeführt |
| Max pro Sektor | **20% Portfolio** (~$700) | Neue Trades im Sektor gesperrt |
| Stop-Loss Pflicht | **Jeder Trade** | Kein SL = Kein Trade |
| Max offene Positionen | **6 gleichzeitig** | Neue Position erst nach Close |
| Max Trades/Woche | **3 neue Trades** | Warten bis nächste Woche |
| Max Portfolio-Drawdown | **-20%** | Kill-Switch → Full Stop |
| Max Einzelposition-Verlust | **-10% vom Entry** | Automatischer SL-Trigger |
| Korrelations-Limit | Max 3 Coins im gleichen Ökosystem | Diversifikation erzwingen |

**Positionsgrößen-Formel:**

```
Positionsgröße = (Portfolio × 0.02) / (Entry - StopLoss)
Max: 5% Portfolio
```

---

### Modul D — Playbooks

#### Playbook 1: Breakout (Volumen-Bestätigung)

| Feld | Wert |
|------|------|
| **Setup** | Preis bricht über klar definierte Resistance mit >2x Durchschnittsvolumen |
| **Entry** | Erste 4h-Kerze Close über Resistance |
| **Stop-Loss** | Unterkante der Breakout-Kerze oder letzte Support-Zone (-5% bis -8%) |
| **Take-Profit** | TP1: +10% (50% Position), TP2: +20% (30% Position), Trail: 10% (20%) |
| **R:R Minimum** | 2:1 |
| **Invalidation** | Preis fällt zurück unter Resistance innerhalb 24h |
| **Minimaldaten** | 4h-Chart, Volumen-Spike bestätigt, RSI <80, kein Major-Resistance direkt darüber |
| **Checklist** | ☐ Volumen >2x Avg ☐ Resistance klar definiert ☐ RSI nicht überkauft ☐ Kein News-Event in 24h ☐ Honeypot OK ☐ Liquidity OK |

#### Playbook 2: Pullback-to-Support (Trend-Following)

| Feld | Wert |
|------|------|
| **Setup** | Intakter Aufwärtstrend (Higher Highs/Higher Lows), Pullback auf Support/EMA |
| **Entry** | Bounce-Bestätigung: 4h-Kerze mit Higher Low auf Support/EMA21 |
| **Stop-Loss** | Unter letztem Higher Low (-5% bis -10%) |
| **Take-Profit** | TP1: Letztes High (+8-15%), TP2: Fibonacci Extension 1.618 |
| **R:R Minimum** | 2.5:1 |
| **Invalidation** | Break unter letztes Higher Low auf 4h-Close |
| **Minimaldaten** | Trend seit min. 2 Wochen intakt, min. 2 Higher Lows, Volumen bei Bounce steigend |
| **Checklist** | ☐ Trend intakt ☐ Support klar ☐ Volumen bestätigt Bounce ☐ RSI 40-60 ☐ Kein Divergenz-Signal |

#### Playbook 3: Catalyst Play (Listing/Release/Partnership)

| Feld | Wert |
|------|------|
| **Setup** | Bestätigter Katalysator: CEX-Listing, Mainnet-Launch, Major-Partnership |
| **Entry** | 24-72h VOR Event, bei erstem Momentum-Signal (Volumen +50%) |
| **Stop-Loss** | -8% vom Entry (enger wegen Event-Risk) |
| **Take-Profit** | TP1: +15% (70% Position VOR Event), TP2: +30% (nur wenn Post-Event-Momentum) |
| **R:R Minimum** | 2:1 |
| **Invalidation** | Katalysator wird verschoben/gecancelt, oder Sell-the-News beginnt vor TP1 |
| **Minimaldaten** | Offizielle Ankündigung, min. 2 Quellen bestätigen, On-Chain-Aktivität steigt |
| **Checklist** | ☐ Quelle offiziell ☐ 2+ Bestätigungen ☐ Event-Datum fix ☐ Kein Front-Running erkennbar ☐ 70% raus VOR Event |

---

### Modul E — Decision Gate (Go/No-Go)

**Jeder Trade muss ALLE Punkte bestehen:**

| # | Check | Bestanden? |
|---|-------|-----------|
| 1 | Honeypot-Check negativ (kein Honeypot) | ☐ |
| 2 | Liquidity >$50k | ☐ |
| 3 | Sell Tax <5% | ☐ |
| 4 | LP locked >6 Monate | ☐ |
| 5 | Score ≥7/10 im Deep-Dive | ☐ |
| 6 | R:R ≥ 2:1 | ☐ |
| 7 | Positionsgröße ≤5% Portfolio | ☐ |
| 8 | Sektor-Exposure ≤20% nach Trade | ☐ |
| 9 | Max 6 offene Positionen nicht überschritten | ☐ |
| 10 | Stop-Loss definiert und eingetragen | ☐ |
| 11 | Playbook ausgewählt und dokumentiert | ☐ |
| 12 | Button-Confirm durch Juri ODER Chris | ☐ |

**Ergebnis: 12/12 = GO. <12 = NO-GO. Keine Ausnahmen.**

---

## 3) UMSETZUNGSPLÄNE

### First 24 Hours — Top 5 Schritte

| # | Ziel | Beschreibung | Warum | Aufwand | Risiko | Owner | Deadline | Success-Kriterium |
|---|------|-------------|-------|---------|--------|-------|----------|-------------------|
| 1 | **Risk Engine aktivieren** | Stop-Loss für alle 6 bestehenden Positionen definieren und dokumentieren | Ohne SL = unkontrolliertes Risiko | S | Hoch (kein SL = offenes Risiko) | Milo | Tag 1, 12:00 | Alle 6 Positionen haben SL-Level dokumentiert |
| 2 | **Portfolio-Snapshot** | Aktuellen Stand aller 6 Coins erfassen: Entry, aktueller Preis, P&L, Sektor | Baseline für Tracking | S | Niedrig | Milo | Tag 1, 14:00 | Snapshot-Tabelle im Trade-Journal |
| 3 | **Decision Gate Template** | Go/No-Go Checkliste als Telegram-Bot-Template implementieren | Kein Trade ohne Gate | M | Niedrig | Milo | Tag 1, 18:00 | Bot sendet Checkliste vor jedem Trade |
| 4 | **Trade-Journal erstellen** | Google Sheet oder Markdown-Template mit allen Pflichtfeldern | Ohne Journal kein Review möglich | S | Niedrig | Milo | Tag 1, 20:00 | Template erstellt und geteilt |
| 5 | **Team-Briefing** | Juri & Chris: Regeln durchgehen, Commitment einholen | Buy-In nötig sonst wird es ignoriert | S | Mittel (Widerstand möglich) | Juri/Chris | Tag 1, 22:00 | Alle 3 haben Regeln bestätigt |

### First 7 Days — Top 10 Schritte

| # | Ziel | Beschreibung | Warum | Aufwand | Risiko | Owner | Deadline | Success-Kriterium |
|---|------|-------------|-------|---------|--------|-------|----------|-------------------|
| 1 | **Watchlist-System** | Täglichen Watchlist-Tracker aufsetzen mit Score-System | Systematische Pipeline statt Ad-hoc | M | Niedrig | Milo | Tag 2 | Tracker läuft, 5+ Kandidaten bewertet |
| 2 | **Honeypot-Automation** | RugCheck/GoPlus API in Bot integrieren | Manuelle Checks sind fehleranfällig | M | Niedrig | Milo | Tag 3 | Bot prüft automatisch bei /check [token] |
| 3 | **Liquidity-Monitor** | DexScreener/Birdeye Alerts für bestehende Positionen | Frühwarnung bei Liquidity-Abzug | M | Mittel | Milo | Tag 3 | Alerts aktiv für alle 6 Coins |
| 4 | **Playbook-Drill** | Einen Paper-Trade pro Playbook durchspielen | Playbooks testen ohne Risiko | S | Niedrig | Milo | Tag 4 | 3 Paper-Trades dokumentiert |
| 5 | **Scorecard v1** | Erste Wochen-Scorecard ausfüllen | Baseline-Messung | S | Niedrig | Milo | Tag 7 | Scorecard ausgefüllt mit Ist-Werten |
| 6 | **Sektor-Mapping** | Alle 6 Coins Sektoren zuordnen, Exposure berechnen | Klumpenrisiko erkennen | S | Niedrig | Milo | Tag 2 | Sektor-Tabelle mit %-Allocation |
| 7 | **Alert-System** | Preis-Alerts bei SL- und TP-Levels für alle Positionen | Kein manuelles Überwachen nötig | M | Niedrig | Milo | Tag 4 | Alerts aktiv, Test-Alert empfangen |
| 8 | **Discovery-Routine** | Tägliche 10-Min Discovery-Routine definieren und starten | Pipeline füllen | S | Niedrig | Alle | Tag 3 | 3 Tage hintereinander durchgeführt |
| 9 | **Kill-Switch testen** | Simualtion: Was passiert bei -20% Drawdown? Alle Schritte durchgehen | Im Ernstfall muss es sitzen | S | Niedrig | Milo | Tag 5 | Ablauf dokumentiert und bestätigt |
| 10 | **Weekly Review #1** | Erste Weekly Scorecard + 3 Entscheidungen | Review-Rhythmus etablieren | M | Niedrig | Alle | Tag 7 | Review durchgeführt, 3 Actions definiert |

### First 30 Days — Top 10 Schritte

| # | Ziel | Beschreibung | Warum | Aufwand | Risiko | Owner | Deadline | Success-Kriterium |
|---|------|-------------|-------|---------|--------|-------|----------|-------------------|
| 1 | **Erster System-Trade** | Einen Trade vollständig nach Playbook + Decision Gate durchführen | Proof of Concept | M | Mittel | Alle | Tag 10 | Trade im Journal, Gate 12/12 |
| 2 | **Portfolio-Rebalancing** | Bestehende Positionen gegen neue Regeln prüfen, ggf. reduzieren | Legacy-Positionen könnten Regeln verletzen | M | Mittel | Juri/Chris | Tag 14 | Alle Positionen regelkonform |
| 3 | **Automation v2** | Bot: Auto-Watchlist-Update, täglicher Portfolio-Report | Weniger manuelle Arbeit | L | Niedrig | Milo | Tag 21 | Bot sendet täglichen Report automatisch |
| 4 | **Playbook-Refinement** | Nach 3+ Trades: Playbooks anpassen basierend auf Erfahrung | Kontinuierliche Verbesserung | M | Niedrig | Milo | Tag 30 | Mindestens 1 Playbook-Anpassung dokumentiert |
| 5 | **Monthly Review** | Voller Monats-Review: Performance, Playbooks, Prozess | Systemische Optimierung | M | Niedrig | Alle | Tag 30 | Review-Dokument erstellt |
| 6 | **Korrelations-Analyse** | Korrelation zwischen bestehenden Positionen messen | Diversifikation validieren | M | Niedrig | Milo | Tag 14 | Korrelations-Matrix erstellt |
| 7 | **Drawdown-Stress-Test** | Szenario-Analyse: Was wenn BTC -30%? Portfolio-Impact? | Worst-Case-Vorbereitung | M | Niedrig | Milo | Tag 21 | Stress-Test dokumentiert |
| 8 | **Datenqualität-Audit** | Coinpaprika-Daten gegen CoinGecko/DexScreener validieren | Falsche Daten = falsche Entscheidungen | M | Niedrig | Milo | Tag 14 | Abweichungs-Report erstellt |
| 9 | **Team-Retro** | Was läuft, was nicht, was ändern? | Team-Alignment | S | Niedrig | Alle | Tag 30 | 3 Keep / 3 Change dokumentiert |
| 10 | **System v2.1 Roadmap** | Basierend auf Monat 1: Nächste Features priorisieren | Weiterentwicklung planen | M | Niedrig | Milo | Tag 30 | Priorisierte Feature-Liste |

---

## 4) TRACKING-SETUP

### Wöchentliche Scorecard

| Metrik | Ziel | KW__ Ist | Status |
|--------|------|----------|--------|
| Portfolio-Drawdown (vom ATH) | < -20% | | 🟢🟡🔴 |
| Winrate (geschlossene Trades) | > 50% | | 🟢🟡🔴 |
| Avg R (Gewinn/Verlust-Verhältnis) | > 1.5 | | 🟢🟡🔴 |
| Fehlerquote (Regel-Verstöße) | 0 | | 🟢🟡🔴 |
| Gesamt-Exposure (% investiert) | 40-80% | | 🟢🟡🔴 |
| Trades diese Woche | ≤ 3 | | 🟢🟡🔴 |
| Decision Gates bestanden | 12/12 jeder | | 🟢🟡🔴 |
| Discovery-Sessions | ≥ 5 | | 🟢🟡🔴 |

### Trade-Journal (pro Trade)

| Feld | Beschreibung |
|------|-------------|
| Trade-ID | Fortlaufend: MCS-001, MCS-002, ... |
| Datum Open | Entry-Datum |
| Datum Close | Exit-Datum |
| Coin/Pair | z.B. RAIN/USDT |
| Exchange | MEXC / Raydium |
| Playbook | Breakout / Pullback / Catalyst |
| Entry-Preis | Kaufpreis |
| Positionsgröße ($) | Dollar-Betrag |
| Positionsgröße (%) | % des Portfolios |
| Stop-Loss | SL-Level |
| Take-Profit 1/2/3 | TP-Levels |
| R:R bei Entry | Geplantes Risk:Reward |
| Exit-Preis | Tatsächlicher Verkaufspreis |
| P&L ($) | Gewinn/Verlust in Dollar |
| P&L (%) | Gewinn/Verlust in Prozent |
| R realisiert | Tatsächliches R-Multiple |
| Decision Gate | 12/12? Wenn nein, was gefehlt? |
| Thesis | Warum dieser Trade? (1-2 Sätze) |
| Fehler/Lessons | Was lief gut/schlecht? |
| Screenshot | Chart zum Zeitpunkt des Entry |

### Watchlist-Tracker (täglich)

| Kandidat | Score (/10) | Red Flags | Catalyst | Trigger-Level | Status |
|----------|------------|-----------|----------|---------------|--------|
| _Coin A_ | _8_ | _Team anon_ | _CEX-Listing Q1_ | _$0.05 Break_ | 🔍 Watch |
| _Coin B_ | _6_ | _Low LP_ | _Mainnet_ | _$1.20 Support_ | ⏸️ Hold |

---

## 5) REVIEW-ZYKLEN

### Daily Check (10 Min, jeden Morgen)

| # | Aufgabe | Dauer |
|---|---------|-------|
| 1 | Portfolio-Wert checken, Drawdown berechnen | 2 min |
| 2 | SL/TP-Levels prüfen — wurden Alerts ausgelöst? | 2 min |
| 3 | News-Scan: Gibt es Katalysatoren/Red Flags? | 3 min |
| 4 | Watchlist aktualisieren (1-2 neue Kandidaten prüfen) | 3 min |

### Weekly Review (Sonntag, 30 Min)

| # | Aufgabe |
|---|---------|
| 1 | Scorecard ausfüllen |
| 2 | Alle offenen Positionen bewerten: Halten/Reduzieren/Schließen? |
| 3 | 3 konkrete Entscheidungen für nächste Woche treffen |
| 4 | Pipeline-Status: Gibt es Setup-Ready Kandidaten? |
| 5 | Fehler-Analyse: Gab es Regel-Verstöße? |

### Monthly Review (Monatsende, 60 Min)

| # | Aufgabe |
|---|---------|
| 1 | Performance-Report: Gesamt P&L, Winrate, Avg R |
| 2 | Playbook-Analyse: Welches Playbook performt am besten? |
| 3 | Risk Engine Review: Waren die Limits angemessen? |
| 4 | Prozess-Optimierung: Was vereinfachen/automatisieren? |
| 5 | Team-Retro: Was sagt Juri/Chris? |

---

## 6) KILL-SWITCH-REGELN

> ⚠️ **Diese Regeln sind HART und NICHT VERHANDELBAR.**

| # | Trigger | Aktion | Dauer |
|---|---------|--------|-------|
| **K1** | Portfolio-Drawdown ≥ -20% | **ALLE Trades stoppen.** Keine neuen Positionen. Nur bestehende SLs laufen lassen. | Bis Team-Review + expliziter Restart |
| **K2** | 3 Verlust-Trades in Folge | **Pause: 7 Tage keine neuen Trades.** Review aller 3 Trades. | 7 Tage |
| **K3** | Einzelposition -15% unter Entry | **Sofort schließen.** SL hätte bei -10% greifen müssen → Fehleranalyse. | Sofort |
| **K4** | Liquidity eines gehaltenen Coins fällt unter $25k | **Position innerhalb 24h schließen.** | 24h |
| **K5** | Regel-Verstoß (Trade ohne Decision Gate) | **Trade sofort schließen**, unabhängig von P&L. Warnung an Team. | Sofort |
| **K6** | Honeypot-Verdacht bei gehaltenem Coin | **Sofort maximal möglichen Betrag verkaufen.** | Sofort |
| **K7** | Mehr als 3 Trades in einer Woche | **Woche ist gesperrt.** Kein weiterer Trade bis Montag. | Bis Montag |

---

## APPENDIX: Aktuelles Portfolio (Stand 11.02.2026)

| Coin | Exchange | Sektor | Anteil (ca.) | SL-Level | Status |
|------|----------|--------|-------------|----------|--------|
| RAIN | MEXC | AI/Data | tbd | tbd | 🔍 Review nötig |
| LUNAI | MEXC | AI | tbd | tbd | 🔍 Review nötig |
| VIRTUAL | MEXC | AI/Metaverse | tbd | tbd | 🔍 Review nötig |
| GRIFFAIN | MEXC | AI/DeFi | tbd | tbd | 🔍 Review nötig |
| DEAI | MEXC | AI | tbd | tbd | 🔍 Review nötig |
| RAY | Raydium | DeFi/DEX | tbd | tbd | 🔍 Review nötig |

> ⚠️ **Aktion erforderlich:** Alle SL-Levels müssen innerhalb von 24h definiert werden (Schritt 1 im Umsetzungsplan).

---

*Dokument erstellt von MILO — Master-Operator, Milo Crypto System v2.0*
*Nächster Review: KW 07/2026*
