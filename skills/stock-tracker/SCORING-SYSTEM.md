# Stock Scoring System v2 — 0-100 mit Sternchenfragen

## Kategorien (90 Punkte Basis)

### 📊 Fundamentals (30 Punkte)
| Kriterium | Max | Erklärung |
|-----------|-----|-----------|
| KGV vs Branche | 8 | Unter Branchenschnitt = hoch, negatives KGV bei Growth OK wenn Umsatz steigt |
| Umsatzwachstum | 8 | >20% = 8, 10-20% = 6, 5-10% = 4, 0-5% = 2, negativ = 0 |
| Gewinnmarge | 7 | Profitabel + steigende Marge = hoch |
| Schuldenquote | 7 | Debt/Equity <0.5 = 7, <1 = 5, <2 = 3, >2 = 1 |

### 📈 Technicals (25 Punkte)
| Kriterium | Max | Erklärung |
|-----------|-----|-----------|
| Abstand 52W-Hoch | 8 | -30% bis -50% = Chance (8), nahe ATH = neutral (4), >-60% = Risiko (2) |
| Preistrend 7d/30d | 9 | Aufwärtstrend + Momentum = hoch |
| Volumen-Anomalien | 8 | Überdurchschnittliches Volumen bei Kursanstieg = bullish |

### 🧠 AI/Narrativ (20 Punkte)
| Kriterium | Max | Erklärung |
|-----------|-----|-----------|
| Stärke der These | 8 | Klarer, differenzierter Investment-Case |
| Analysten-Consensus | 6 | Strong Buy/Buy = hoch, Hold = mittel, Sell = niedrig |
| Katalysator-Timing | 6 | Konkreter Katalysator in <3 Monaten = 6, 3-6M = 4, >6M = 2 |

### 📰 Sentiment & News (15 Punkte)
| Kriterium | Max | Erklärung |
|-----------|-----|-----------|
| Analysten-Upgrades | 5 | Kürzliche Upgrades von Top-Banken |
| Insider-Aktivität | 5 | Käufe = bullish, Verkäufe = bearish |
| Social/News-Sentiment | 5 | Positive Berichterstattung, steigende Mentions |

**Basis-Maximum: 90 Punkte**

### 🎯 Bonus (10 Punkte)
| Kriterium | Max | Erklärung |
|-----------|-----|-----------|
| Multi-Katalysator | 4 | Mehrere unabhängige Katalysatoren gleichzeitig |
| Institutionelle Käufe | 3 | Große Fonds bauen Position auf |
| Sektor-Momentum | 3 | Gesamter Sektor im Aufwind |

**Gesamt-Maximum: 100 Punkte**

---

## ⭐ Sternchenfragen (Hard Rules)

### 🔴 K.O.-Kriterien → Score gedeckelt auf MAX 30
- ⭐ SEC-Klage oder aktiver Fraud-Verdacht
- ⭐ Delisting-Warnung / Compliance-Verstoß an der Börse
- ⭐ CEO/CFO plötzlich zurückgetreten ohne Nachfolger
- ⭐ Insolvenzgefahr (Cash reicht < 6 Monate bei aktuellem Burn)

### 🟠 Schwere Verstöße → -20 Punkte
- ⭐ Massives Insider-Selling (>5% der Anteile in 30 Tagen)
- ⭐ Earnings Miss >20% unter Erwartung
- ⭐ Kein Umsatz UND kein klarer Pfad zur Profitabilität
- ⭐ Short Interest >30%

### 🟡 Moderate Verstöße → -10 Punkte
- ⭐ Verwässerung >10% in 12 Monaten (Kapitalerhöhung)
- ⭐ Auditor-Wechsel oder "Going Concern" im Jahresbericht
- ⭐ Schlüsselkunde >50% Umsatzanteil (Klumpenrisiko)
- ⭐ Market Cap <$100M ohne institutionelle Investoren

---

## Ergebnis-Ampel
| Score | Ampel | Bedeutung |
|-------|-------|-----------|
| 80-100 | 🟢 | Strong — Top-Kandidat für Investment |
| 60-79 | 🟡 | Interesting — Watchlist, weiter beobachten |
| 40-59 | 🟠 | Neutral — Halten oder Vorsicht |
| <40 | 🔴 | Weak — Auto-Demote nach Rejected |

---

## Score-Breakdown Format (für DB + Dashboard)

```json
{
  "fundamentals": {"kgv": 6, "umsatz": 8, "marge": 5, "schulden": 7, "total": 26},
  "technicals": {"52w_abstand": 6, "preistrend": 7, "volumen": 5, "total": 18},
  "narrativ": {"these": 7, "analysten": 4, "katalysator": 5, "total": 16},
  "sentiment": {"upgrades": 3, "insider": 4, "social": 3, "total": 10},
  "bonus": {"multi_katalysator": 2, "institutionell": 3, "sektor": 2, "total": 7},
  "basis_score": 77,
  "star_violations": [
    {"level": "moderate", "rule": "MC <$100M ohne Institutionelle", "penalty": -10}
  ],
  "final_score": 67,
  "ko_triggered": false
}
```

## ZWEI PFLICHT-FELDER für jede Aktie

### 1. overall_reasoning (Narrative Erklärung)
**3-4 vollständige Sätze mit Insights und Story!**

Beispiel:
```
Micron dominiert den HBM-Markt als einer von nur drei Herstellern weltweit und ist bis Ende 2026 komplett ausverkauft. Forward PE von ~12x ist historisch günstig für ein Unternehmen mit 2x Umsatzwachstum und 95% bullishen Analysten mit Street-High Target $600. S&P Credit-Upgrade auf BBB und neue $2.75B Indien-Fabrik zeigen Stärke. Hauptrisiko bleibt die Zyklizität des Memory-Marktes.
```

**Anforderungen:**
- ✅ Lesbare Sätze (KEINE Stichworte!)
- ✅ Investment-Thesis + Katalysatoren
- ✅ Wichtigste Risiken
- ✅ Aktuelle News/Insights wenn relevant
- ✅ 150-250 Zeichen

### 2. score_explanation (Detaillierte Kategorie-Breakdown)
**ALLE 5 Kategorien + Punkte + Sternchen!**

Format:
```
📊 Fundamentals (26/30): KGV unter Branche (7), Umsatzwachstum +18% YoY (7), Marge steigend auf 32% (6), niedrige Schulden (6). 📈 Technicals (18/25): 38% unter 52W-Hoch (6), Aufwärtstrend 7d/30d (7), überdurchschnittliches Volumen (5). 🧠 Narrativ (16/20): Klare AI-Infrastruktur-These (7), Analysten 85% Buy (4), Q2 Earnings in 4 Wochen (5). 📰 Sentiment (10/15): Upgrade von JPM auf Outperform (3), Insider-Käufe CEO (4), positive Presse (3). 🎯 Bonus (7/10): 2 unabhängige Katalysatoren (2), Blackrock +5% Position (3), Sektor +12% YTD (2). ⭐ Sternchen: Klumpenrisiko TSLA >50% Umsatz (-10). Basis 77 → Final 67.
```

**Anforderungen:**
- ✅ Alle 5 Kategorien mit Punkte-Summe (z.B. "Fundamentals 26/30")
- ✅ Wichtigste Unterpunkte pro Kategorie mit Einzelpunkten
- ✅ Sternchen-Violations wenn vorhanden (Art + Strafe)
- ✅ Basis-Score → Final-Score wenn Sternchen
- ✅ 200-350 Zeichen

## Dashboard-Erklärung

Jede Aktie zeigt im Dashboard:
1. **Gesamtscore** (große Zahl + Ampel-Farbe)
2. **Balkendiagramm** der 5 Kategorien (Fundamentals, Technicals, Narrativ, Sentiment, Bonus)
3. **Sternchen-Warnungen** (rot markiert wenn vorhanden)
4. **Vollständige Reasoning** (alle Kategorien + Punkte + Sternchen)
5. **Score-Trend** (Pfeil: ↑↓→ vs letzter Score)
