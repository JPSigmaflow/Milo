# Milo Supervisor MVP

Health-Monitor für Milos 5 Sub-Bots auf OpenClaw.

## Bots
| Bot | Agent | Checks |
|-----|-------|--------|
| 🧘 MiloCoach | milocoach | Session, 1 Cron |
| 🍟 Pomi | pomesteam | Session, 4 Crons |
| 🎰 Pump | pump | Session, 4 Crons, pumpfun-tracker.db |
| 📊 Guardian | guardian | Session, 3 Crons, portfolio.db |
| 📡 Analyst | analyst | Session, 4 Crons, scanner.db |

## Usage
```bash
# Single check cycle
python3 supervisor_milo.py --once

# Continuous monitoring (every 5 min)
python3 supervisor_milo.py

# Daily summary only
python3 supervisor_milo.py --summary
```

## Health Checks
- **Sessions**: `openclaw sessions list` → agent aktiv?
- **Crons**: `openclaw crons list` → jobs registriert?
- **DBs**: SQLite `PRAGMA integrity_check` + file age
- **Dashboard**: HTTP check auf localhost:8081

## Features
- **Circuit Breaker**: Nach 5 Fails → Bot disabled, Reset nach 1h
- **Audit Trail**: Alles in `supervisor.db` (SQLite)
- **Alerts**: Telegram an WEundMILO bei DOWN/RECOVERED
- **Daily Summary**: 22:00 EST automatisch

## Config
Alles in `bots_config.json` — keine Hardcodes im Python.
