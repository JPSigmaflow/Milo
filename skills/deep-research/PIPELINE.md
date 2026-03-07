# Stock Pipeline — Datenfluss

## Regel: Jede Aktie existiert in NUR EINER Tabelle!

```
┌─────────────┐      promote       ┌─────────────┐      promote       ┌─────────────┐
│ DISCOVERIES │  ──────────────►   │  WATCHLIST   │  ──────────────►   │  HOLDINGS   │
│  (Neue Funde) │   → watchlist     │ (Beobachtung) │   → holding       │  (Gekauft)  │
└─────────────┘                    └─────────────┘                    └─────────────┘
      │                                   │                                  
      │ promote → holding                 │ rejected                        
      │ (Direktkauf)                      ▼                                 
      │                            ┌─────────────┐                         
      └──────────────────────────► │  GELÖSCHT   │                         
               rejected            └─────────────┘                         
```

## Ablauf

1. **Deep Research** findet neue Aktie → speichert in `discoveries`
2. **User sagt "Watchlist"** → `promote TICKER watchlist`
   - Eintrag wird von discoveries in watchlist VERSCHOBEN (nicht kopiert!)
   - discoveries-Eintrag wird GELÖSCHT
3. **User kauft** → `promote TICKER holding`
   - Eintrag wird von watchlist in holdings VERSCHOBEN
   - watchlist-Eintrag wird GELÖSCHT
   - (Oder direkt von discoveries → holdings)
4. **User sagt "Skip/Reject"** → `promote TICKER rejected`
   - Eintrag wird aus discoveries/watchlist GELÖSCHT

## Einheitliche Research-Spalten (in ALLEN 3 Tabellen)

| Spalte | Beschreibung |
|--------|-------------|
| score | Research Score 0-10 |
| research_source | Quelle (deep_research_claude, perplexity, manual, ...) |
| research_date | Datum der Analyse |
| category | indirect_ai, ai_fear_victim, picks_shovels, ... |
| thesis | Begründung warum kaufen |
| risk_factors | Risiken |
| catalyst | Was den Kurs treiben könnte |

## Kommandos

```bash
# Prüfen wo eine Aktie ist
python3 scripts/discovery-db.py exists TICKER

# Discovery → Watchlist
python3 scripts/discovery-db.py promote TICKER watchlist

# Watchlist → Holdings  
python3 scripts/discovery-db.py promote TICKER holding

# Löschen (aus discoveries oder watchlist)
python3 scripts/discovery-db.py promote TICKER rejected
```

## Wichtig
- KEIN Eintrag darf in 2 Tabellen gleichzeitig sein
- Beim Verschieben werden ALLE Spalten mitgenommen
- Research-Daten gehen NIEMALS verloren
