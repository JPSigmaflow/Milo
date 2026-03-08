# PUMP.FUN EXPLODER-FINDER — GOVERNANCE & LEARNING FRAMEWORK
**Version:** 1.0.0  
**Scope:** AUSSCHLIESSLICH Pump.fun-Coins  
**Status:** ACTIVE  
**Erstellt:** 2026-02-25  
**Owner:** Milo (Quant Lead) + Chris + Juri (Governance Board)

---

## EXECUTIVE STATEMENT

Die Historical-DB für PUMP.FUN ist unser Beweissystem. Die 12 Kriterien sind kontrollierte Hypothesen für dieses Universum. Anpassungen erfolgen ausschließlich datenbasiert (ZDF) und abgestimmt. Keine Abstimmung = keine Änderung. Kein PUMP.FUN-Source = kein Scoring.

---

## SOCRATIC ANSWERS

### 1) Was bedeutet "explodieren" messbar?
**Definition:** Ein Pump.fun-Coin "explodiert" wenn er innerhalb definierter Zeitfenster bestimmte ROI-Schwellen überschreitet — gemessen ab Entry-Preis (erster Snapshot nach Add).

### 2) Outcome-Klassen
| Klasse | Definition | Bedingung |
|--------|-----------|-----------|
| 🚀 **EXPLODER** | Massiver ROI in kurzer Zeit | ≥ +300% in 72h ODER ≥ +1000% in 14d |
| 📈 **MILD EXPLODER** | Solide Performance | ≥ +100% in 72h ODER ≥ +300% in 14d |
| ➡️ **NORMAL** | Seitwärts oder moderate Bewegung | Weder Exploder noch Fail |
| 💀 **FAIL** | Starker Verlust | ≤ -80% Drawdown vom Entry |
| 🚨 **RUG** | Liquidity-Pull oder Scam | Liquidity ≤ -70% in 24h ODER Volume → 0 |

### 3) Zeitfenster für Tracking
| Fenster | Zweck |
|---------|-------|
| 6h | Frühindikator, Volume-Acceleration |
| 24h | Erste Momentum-Bestätigung |
| 72h | Exploder-Klassifikation (Hauptfenster) |
| 7d | Mittelfrist-Performance |
| 14d | Langfrist-Klassifikation, finale Bewertung |

### 4) Führende Muster bei Pump.fun-Coins
- **Volume-Acceleration:** Vol steigt über 3+ Snapshots → Vorläufer für Price-Move
- **Liquidity-Stabilität:** LP bleibt stabil oder steigt → kein Rug-Signal
- **Holder-Expansion:** Neue Wallets kaufen → organisches Wachstum (via DexScreener txns)
- **MC-Breakout:** Durchbruch über $100K MC → Graduation-Effekt
- **Cross-Platform-Momentum:** Token taucht auf Twitter/TikTok Trending auf

### 5) KPIs zur Kriterien-Validierung
| KPI | Beschreibung | Ziel |
|-----|-------------|------|
| **Hit-Rate** | % der Score ≥8 Coins die Exploder werden | ≥ 15% |
| **Precision** | Exploder / (Exploder + False Positives) | ≥ 20% |
| **Miss-Rate** | Exploder die Score < 8 hatten (wir verpasst haben) | ≤ 30% |
| **Avg Drawdown** | Durchschnittlicher Max-Drawdown aller Watchlist-Coins | Monitor |
| **Time-to-ATH** | Median Zeit von Entry bis ATH | Monitor |
| **Rug-Rate** | % der Score ≥8 Coins die Rug sind | ≤ 10% |
| **Coverage** | Mindestanzahl qualifizierter Coins pro Woche | ≥ 3 |

### 6) Overfitting-Vermeidung bei Microcaps
- **Minimum Datenbasis:** Keine Parameteränderung unter 50 gelabelten Coins
- **Out-of-Sample:** 30% der Daten werden für Validierung zurückgehalten
- **Zeitliche Trennung:** Train auf Woche 1-3, Validate auf Woche 4
- **Keine Curve-Fitting:** Änderungen müssen logisch begründbar sein (nicht nur statistisch)
- **Stable Improvement:** Neue Parameter müssen in ≥ 3 verschiedenen Wochen besser sein

### 7) Keine eigenständige Anpassung der 12 Kriterien
- Kriterien sind LOCKED BASELINE (v1.0.0)
- Milo darf Daten sammeln, analysieren, Vorschläge machen
- Milo darf NICHT eigenständig Kriterien ändern
- Jeder ZDF-Vorschlag geht an Chris + Juri zur Abstimmung

### 8) Governance-Struktur
```
VORSCHLAG (Milo) → ZDF-REPORT → REVIEW (Chris + Juri) → APPROVAL (2/2) → DEPLOY
                                                              ↓
                                                        ABLEHNUNG → Dokumentation
```
- **Quorum:** 2 von 2 (Chris UND Juri müssen zustimmen)
- **Vetorecht:** Jeder kann blockieren
- **Eskalation:** Bei Uneinigkeit → 7 Tage Daten sammeln → erneut vorlegen

### 9) Revisionssichere Dokumentation
- Jede Änderung erzeugt neue `criteria_version` (SemVer)
- Changelog in `CRITERIA-CHANGELOG.md`
- Jeder Eintrag: Version, Datum, Änderung, Begründung, Daten-Referenz, Approved-By
- Git-History als Backup

### 10) Technische Gates
- `criteria_version` + `parameter_hash` bei JEDER Bewertung gespeichert
- Runtime-Check: Wenn Version in DB ≠ aktive Version → ALARM
- Scope-Check: Nur Coins mit Pump.fun-Adresse (`*pump` suffix) werden bewertet

---

## TEIL A — EXPLODER-DEFINITION

### Klassifikation (verbindlich ab 2026-02-25)

**🚀 EXPLODER:**
- ROI ≥ +300% innerhalb 72h ab Entry, ODER
- ROI ≥ +1000% innerhalb 14d ab Entry
- UND Liquidity nicht unter -50% gefallen (kein Rug mit Dead-Cat-Bounce)

**📈 MILD EXPLODER:**
- ROI ≥ +100% innerhalb 72h, ODER
- ROI ≥ +300% innerhalb 14d
- UND kein Rug-Signal

**💀 FAIL:**
- Max Drawdown ≥ -80% vom Entry-Preis
- ODER Liquidity ≤ -70% in 24h (= Rug)
- ODER Volume → $0 für 48h+ (= Dead Token)

**➡️ NORMAL:** Alles dazwischen.

### Labeling-Logik
- Label wird nach 14d vergeben (finale Klassifikation)
- Vorläufiges Label nach 72h (kann sich noch ändern)
- Label-Felder: `outcome_72h`, `outcome_14d`, `outcome_final`

---

## TEIL B — LEARNING-LOOP

```
┌─────────────────────────────────────────────────────┐
│  1. SNAPSHOT-TRACKING (alle 6h, automatisch)        │
│     Preis, MC, Volume, Liquidity, Txns              │
│                    ↓                                 │
│  2. OUTCOME-LABELING (nach 72h + 14d)               │
│     Exploder / Mild / Normal / Fail / Rug           │
│                    ↓                                 │
│  3. MUSTERANALYSE (wöchentlich)                     │
│     Score-Buckets vs Outcomes                        │
│     Feature-Importance der 12 Kriterien              │
│     Welche Kriterien korrelieren mit Explodern?      │
│                    ↓                                 │
│  4. ZDF-VORSCHLAG (wenn Daten es hergeben)           │
│     "Kriterium X hat 0% Korrelation mit Exploder"   │
│     "Threshold Y sollte von Z auf W geändert werden" │
│                    ↓                                 │
│  5. ABSTIMMUNG (Chris + Juri)                        │
│     Approve → neue criteria_version                  │
│     Reject → Dokumentation + weiter sammeln          │
│                    ↓                                 │
│  6. ROLLOUT + MONITORING                             │
│     Deploy neue Version                              │
│     7-Tage Monitoring auf Drift + Coverage           │
│     Rollback wenn Coverage < Minimum                 │
└─────────────────────────────────────────────────────┘
```

### Wöchentlicher Analyse-Report (automatisch, ab 50+ Coins)
- Score-Verteilung vs Outcome
- Einzelkriterien Hit-Rate (welches Kriterium korreliert am stärksten?)
- False Positives analysiert
- Missed Exploders analysiert
- Coverage-Check

---

## TEIL C — LOCKED BASELINE (v1.0.0)

### Die 12 Kriterien (EINGEFROREN)

| # | Kriterium | Typ |
|---|-----------|-----|
| 1 | Virale Story | Pflicht |
| 2 | Emotionaler Trigger | Pflicht |
| 3 | Mainstream-Medien | Bonus |
| 4 | TikTok/Social Viralität | Pflicht |
| 5 | Supply-Struktur | Pflicht |
| 6 | Kein Rug-Signal | Pflicht |
| 7 | Community/Socials | Standard |
| 8 | Narrativ-Stärke | Standard |
| 9 | Timing (< 48h nach Viral-Moment) | Pflicht |
| 10 | MC bei Entry (< $500K) | Standard |
| 11 | Wallet-Verteilung (Top 10 < 20%) | Standard |
| 12 | Erster Token (kein Copycat) | Standard |

**criteria_version:** `1.0.0`  
**parameter_hash:** `sha256:locked_baseline_20260225`  
**Alert-Schwelle:** Score ≥ 8/12 → Watchlist, ≥ 10/12 → Sofort-Alert  

### Was als Änderung gilt (ALLES erfordert Abstimmung):
- ✏️ Definition eines Kriteriums ändern
- ⚖️ Gewichtung ändern (Pflicht/Standard/Bonus)
- 📊 Threshold ändern (z.B. MC von $500K auf $1M)
- 🚫 Hard-Exclude hinzufügen/entfernen
- ➕ Sub-Regel hinzufügen/entfernen
- 🎯 Alert-Schwelle ändern (8/12 oder 10/12)
- ⚡ Ad-hoc-Ausnahme gewähren

---

## TEIL D — TECHNISCHE ENFORCEMENT

### DB-Schema Erweiterungen (implementiert)
```sql
-- Jede Bewertung speichert Version + Hash
ALTER TABLE watchlist_coins ADD COLUMN criteria_version TEXT DEFAULT '1.0.0';
ALTER TABLE watchlist_coins ADD COLUMN parameter_hash TEXT DEFAULT 'sha256:locked_baseline_20260225';

-- Outcome-Tracking
ALTER TABLE watchlist_coins ADD COLUMN outcome_72h TEXT CHECK(outcome_72h IN ('exploder','mild_exploder','normal','fail','rug'));
ALTER TABLE watchlist_coins ADD COLUMN outcome_14d TEXT CHECK(outcome_14d IN ('exploder','mild_exploder','normal','fail','rug'));
ALTER TABLE watchlist_coins ADD COLUMN outcome_final TEXT CHECK(outcome_final IN ('exploder','mild_exploder','normal','fail','rug'));
ALTER TABLE watchlist_coins ADD COLUMN labeled_at DATETIME;
```

### Runtime-Checks
1. **Scope-Check:** Token-Adresse muss auf `pump` enden ODER aus `pumpfun-candidates.json` stammen
2. **Version-Check:** Bei jeder Bewertung wird `criteria_version` geprüft — Mismatch → ALARM
3. **Hash-Check:** `parameter_hash` muss mit der aktiven `criteria.yaml` übereinstimmen
4. **Coverage-Guard:** Wenn < 3 qualifizierte Coins/Woche → Warnung an Governance Board

### Approval-Flow
```
Criteria-Änderung vorgeschlagen
  → ZDF-Report erstellt (mit PUMP.FUN-only Datenbasis)
  → Backtest-Ergebnis dokumentiert
  → Chris Approval (via Telegram Button) ✅
  → Juri Approval (via Telegram Button) ✅
  → Neue criteria_version deployed
  → 7-Tage Monitoring
  → Bei Drift > Threshold → Auto-Rollback
```

---

## TEIL E — DEFINITION OF DONE

| # | Kriterium | Status |
|---|-----------|--------|
| 1 | DB existiert mit Schema + Governance-Feldern | ✅ |
| 2 | Nur Pump.fun-Coins werden getrackt | ✅ |
| 3 | 6h Snapshots laufen als Cron | ✅ |
| 4 | Entry-Preis deterministisch gesetzt | ✅ |
| 5 | Outcome-Labels nach 72h + 14d | 🔜 (ab genug Daten) |
| 6 | criteria_version + hash bei jeder Bewertung | 🔜 |
| 7 | Wöchentlicher Analyse-Report | 🔜 (ab 50+ Coins) |
| 8 | Governance-Flow dokumentiert | ✅ |
| 9 | MEXC Listing Detection | ✅ |
| 10 | Coverage-Guardrail | 🔜 |

---

*Dieses Dokument ist verbindlich. Änderungen nur durch Chris + Juri Approval.*
