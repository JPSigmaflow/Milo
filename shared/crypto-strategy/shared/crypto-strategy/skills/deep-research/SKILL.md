---
name: deep-research
description: Daily deep research to discover undervalued and indirect AI beneficiary stocks using Claude deep analysis.
---

# Deep Research Skill

## Overview
Tägliche AI-gestützte Aktienrecherche die über die offensichtlichen AI-Plays hinausgeht.
Findet Firmen die indirekt von AI-Ausgaben profitieren oder wegen AI-Ängsten unterbewertet sind.

## Kernfragen (täglich rotierend)
1. **Indirekte AI-Profiteure:** Welche Firmen profitieren von AI-Ausgaben, ohne selbst das Überinvestitionsrisiko zu tragen? (Memory-Chips, Energie, Kühlung, Netzwerk)
2. **AI-Angst-Opfer:** Welche guten Firmen sind wegen AI-Disruption-Ängsten gefallen und dadurch unterbewertet? (SaaS, Consulting, traditionelle Tech)
3. **AI-Infrastruktur:** Energieversorger, Rechenzentren, Kupfer/Lithium — wer liefert die Grundlagen?
4. **Picks & Shovels:** Wer verkauft die Werkzeuge für den AI-Goldrausch?

## Database
- **Path:** `/shared/stocks.db` (Tabelle: `discoveries`)
- **Felder:** ticker, company, sector, country, exchange, market_cap, current_price, thesis, category, score (0-10), risk_factors, catalyst, pe_ratio, revenue_growth, status

## Categories
- `indirect_ai` — Profitiert von AI-Ausgaben ohne eigenes AI-Risiko
- `undervalued_ai` — Durch AI-Ängste unterbewertet
- `energy` — Energieversorger für Rechenzentren
- `memory` — Memory/Storage-Chips (HBM, NAND)
- `infrastructure` — Netzwerk, Kühlung, Bau
- `picks_shovels` — Werkzeuge/Services für AI-Buildout
- `other` — Sonstige Opportunitäten

## Scripts

### discovery-db.py
```bash
# Prüfen ob Ticker schon bekannt
python3 scripts/discovery-db.py exists TICKER

# Alle bekannten Ticker (für Dedup)
python3 scripts/discovery-db.py known

# Neuen Fund speichern
python3 scripts/discovery-db.py save '{"ticker":"VRT","company":"Vertiv Holdings","sector":"Data Center Cooling","country":"US","exchange":"NYSE","market_cap":"$45B","price":95.0,"thesis":"Marktführer für Rechenzentrum-Kühlung...","category":"infrastructure","score":8.5,"risk_factors":"Hohe Bewertung","catalyst":"AI Capex Cycle"}'

# In Watchlist übernehmen
python3 scripts/discovery-db.py promote TICKER watchlist

# In Holdings übernehmen  
python3 scripts/discovery-db.py promote TICKER holding

# Ablehnen
python3 scripts/discovery-db.py promote TICKER rejected

# Alle Discoveries auflisten
python3 scripts/discovery-db.py list [status] [min_score]
```

## Workflow
1. Lade alle bekannten Ticker (`discovery-db.py known`)
2. Deep Research via Web-Suche + Analyse:
   - Suche nach "undervalued stocks AI spending beneficiaries 2026"
   - Suche nach "stocks fallen on AI disruption fears undervalued"
   - Suche nach "data center energy suppliers stocks"
   - Suche nach "AI infrastructure picks and shovels stocks"
3. Für jeden Fund: Prüfe ob schon bekannt (`exists`)
4. Bewerte mit Score 0-10:
   - 9-10: Exceptional — starke These + Timing + Unterbewertung
   - 7-8: Strong — gute These, klarer Katalysator
   - 5-6: Interesting — weitere Beobachtung nötig
   - <5: Nicht speichern
5. Nur Funde mit Score ≥ 5 speichern
6. Top-Funde (Score ≥ 8) sofort an Alpha Stocks Gruppe melden

## Promotion-Workflow
Wenn Juri/Chris einen Fund gut finden:
- `promote TICKER watchlist` → Übernimmt Daten in Watchlist-Tabelle
- `promote TICKER holding` → Markiert als gehalten
- `promote TICKER rejected` → Abgelehnt, wird nicht nochmal vorgeschlagen

## Output-Format (Telegram)
```
🔬 DEEP RESEARCH — Neue Funde (Datum)

🏆 Score 9.0 | VRT — Vertiv Holdings ($95, NYSE)
📂 Infrastructure | MC: $45B
💡 Marktführer Rechenzentrum-Kühlung, profitiert direkt von AI Capex
⚡ Katalysator: Hyperscaler Capex +40% YoY
⚠️ Risiko: Hohe Bewertung nach Rally

[Watchlist aufnehmen] [Mehr Info] [Skip]
```

## Regeln
- **Nur börsennotierte Firmen** (kein Pre-IPO)
- **Minimum Score 5** zum Speichern
- **Keine Duplikate** — immer gegen alle Tabellen prüfen
- **5 neue Funde pro Tag** — Qualität > Quantität
- **Begründung PFLICHT** — keine Fund ohne klare These
- **Sprache:** Deutsch für Telegram, Englisch für DB-Einträge
