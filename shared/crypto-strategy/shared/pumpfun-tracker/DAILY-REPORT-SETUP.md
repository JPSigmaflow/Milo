# Daily Pump.fun Status Report Setup

**Erstellt:** 2026-03-04 nach Chris' Abmahnung "Du darfst nichts vergessen"

## Automatisierung
1. **Script:** `daily-report.mjs` generiert den Report
2. **Sender:** `send-daily-report.sh` sendet an Pump.Fun Chat (-5100226475)
3. **Backup:** HEARTBEAT.md checkt täglich um ~08:00 EST

## Zeitplan
- **Zielzeit:** 20:00 Shanghai (08:00 EST)
- **Frequenz:** Täglich
- **Chat:** Pump.Fun (-5100226475)

## Inhalt
- Watchlist Stats (aktive Coins, neue heute, Snapshots)
- v1.0 Top 5 Candidates
- v2.0 Top 5 Candidates (Hard Filter Pass)
- Outcomes Summary
- v2.0 Parallel-Test Status

## Eskalation
Falls Report nicht kommt → Chris eskaliert → sofort fixen

## Lesson Learned
Wichtige wiederkehrende Tasks gehören:
1. In automatische Scripts
2. In HEARTBEAT.md als Fallback
3. Dokumentiert mit klarem Verantwortlichen (Milo)
