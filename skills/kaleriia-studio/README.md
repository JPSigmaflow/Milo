# Kaleriia Studio — Agreement Generator Agent

Ein Claude Code Agent, der professionelle Corporate Headshot Agreements als PDF generiert.

## Setup

```bash
# 1. In den Ordner wechseln
cd kaleriia-invoice-agent

# 2. Dependencies installieren
pip install -r requirements.txt

# 3. Claude Code starten
claude
```

## Nutzung mit Claude Code

Einfach in natürlicher Sprache:

```
> Erstelle ein Agreement für John Smith, Firma Acme Corp, Shooting am April 15, 2026 
  im Office 123 Main St Columbia SC
```

Claude Code liest die `CLAUDE.md`, fragt nach fehlenden Infos und generiert die PDF.

## Direkte CLI-Nutzung (ohne Claude Code)

```bash
python generate_agreement.py \
  --client-name "John Smith" \
  --company "Acme Corp" \
  --event-date "April 15, 2026" \
  --location "123 Main St, Columbia, SC"
```

### Alle Parameter

| Parameter | Pflicht | Default | Beschreibung |
|---|---|---|---|
| `--client-name` | ✅ | — | Kundenname |
| `--company` | ✅ | — | Firmenname |
| `--event-date` | ✅ | — | Datum (z.B. "March 28, 2026") |
| `--location` | ✅ | — | Shooting-Ort |
| `--start-time` | ❌ | 9:00 AM | Startzeit |
| `--end-time` | ❌ | 11:00 AM | Endzeit |
| `--rate` | ❌ | 50 | $ pro Teilnehmer |
| `--minimum-fee` | ❌ | 1500 | Mindestbuchung $ |
| `--transport-fee` | ❌ | 200 | Transport & Setup $ |
| `--overtime-rate` | ❌ | 150 | Überstunde $ |
| `--delivery-days` | ❌ | 7–10 | Lieferzeit Werktage |
| `--output` | ❌ | auto | Output-Pfad |

## Output

PDFs landen in `./output/` mit automatischem Naming:
```
output/Agreement_Acme_Corp_2026-02-26.pdf
```

## Projektstruktur

```
kaleriia-invoice-agent/
├── CLAUDE.md              ← Agent-Instruktionen für Claude Code
├── generate_agreement.py  ← PDF-Generator (parametrisiert)
├── requirements.txt       ← Python Dependencies
├── README.md              ← Diese Datei
└── output/                ← Generierte PDFs
```
