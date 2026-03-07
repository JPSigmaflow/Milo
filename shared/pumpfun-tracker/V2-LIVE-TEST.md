# Criteria v2.0 Live-Test

**Start:** 2026-03-04
**Ende:** 2026-03-11
**Status:** RUNNING 🟢

## Setup
- v2.0 Scorer läuft parallel bei jedem Snapshot (alle 6h)
- Scores werden in `criteria_v2_scores` Tabelle gespeichert
- Alte Kriterien (v1.0) laufen unverändert weiter
- Outcomes werden für beide Systeme getrackt

## Am 11. März vergleichen:
1. Welche Coins hat v2.0 als Alert markiert? → Outcomes?
2. Welche Coins hat v1.0 als Alert markiert? → Outcomes?
3. Hit-Rate, Precision, Recall für beide
4. Ergebnis an Chris + Juri → Governance-Entscheidung

## v2.0 Kriterien
### Hard Filter (alle 3 müssen stimmen):
① Liquidity >= $14K
② MC bei Entry: $15K - $200K  
③ Buy/Sell Ratio >= 1.10

### Scoring (0-7):
④ Liquidity >= $25K (+1)
⑤ Buys >= 500 in 24h (+1)
⑥ Liq/MC Ratio 15-50% (+1)
⑦ Volume/MC >= 0.8x (+1)
⑧ Community Momentum (+1)
⑨ Social Viralität (+2)

### Alerts:
- Score >= 4 → Watchlist
- Score >= 5 → Alert
- Score >= 6 → Sofort-Alert

## Backtest-Ergebnis (Baseline):
- OLD: 6.6% Hit-Rate (9/136)
- NEW: 30.0% Hit-Rate (6/20)
- Recall: 67%, Precision: 30%, False Positive: 3%
