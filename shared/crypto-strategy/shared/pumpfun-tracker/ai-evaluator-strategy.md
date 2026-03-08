# AI Evaluator Strategy — Realistic 30-Min Workflow

## Problem
- 15 Tokens ohne Full-Evaluation
- Manuelle 12-Kriterien-Analyse pro Token = ~10-15 Min
- 30-Min-Cron reicht nicht für alle

## Lösung: Hybrid-Ansatz

### Phase 1: Quick Re-Score (5 Min)
Für Tokens MIT criteria_json:
- JSON parsen → Score berechnen
- Asia Social Data hinzufügen (wenn vorhanden)
- Aktuelle MC via DexScreener API
- Score >= 8 → DB Update

### Phase 2: Deep-Dive Top 3 (20 Min)
Für Tokens OHNE criteria_json mit highest initial_score:
1. DexScreener für MC/Liquidity/Socials
2. Web-Search für viral story / mainstream media
3. Twitter/TikTok search (wenn Social links vorhanden)
4. Manual 12-Kriterien-Bewertung
5. DB Insert mit full evaluation

### Phase 3: Sub-Agent Spawn (optional)
Wenn > 5 Tokens übrig:
- Spawn sub-agent für parallele Deep-Research
- Arbeitet async weiter nach Cron-Ende

## Output
- Alerts nur für Score >= 10/12
- Watchlist-Update für Score 8-9
- Rest bleibt in Queue für nächsten Cron
