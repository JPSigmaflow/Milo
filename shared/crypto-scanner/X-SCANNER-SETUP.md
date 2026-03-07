# X-Scanner V2 Setup

## 🎯 Was ist das?

Der neue X-Scanner scannt **alle 1,137 KOLs** aus der config.json in rotierenden Batches:
- **30-50 KOLs pro Run** (vermeidet Rate Limits)
- **19 Priority KOLs** werden IMMER gescannt
- **Automatische Rotation** - jeder Run scannt andere Accounts
- **Smart Filtering** - nur Tweets mit Crypto-Keywords

## 📋 Setup (einmalig)

### 1. X/Twitter Cookies besorgen

**Browser öffnen:**
1. Gehe zu https://x.com und logge dich ein
2. Öffne DevTools (F12 oder Cmd+Opt+I)
3. Tab "Application" → "Cookies" → "https://x.com"
4. Kopiere diese 2 Werte:
   - `auth_token` (langer String)
   - `ct0` (CSRF Token)

### 2. Cookies-Datei erstellen

```bash
cd /Users/milo/.openclaw/workspace/shared/crypto-scanner
cp x-cookies.TEMPLATE.json x-cookies.json
nano x-cookies.json
```

Füge die Werte ein:
```json
{
  "auth_token": "dein_auth_token_hier",
  "ct0": "dein_ct0_token_hier"
}
```

**⚠️ WICHTIG:** x-cookies.json ist `.gitignore`'d - wird NICHT committed!

### 3. Test Run

```bash
node scanners/x-scanner-v2.mjs 10
```

Das scannt 10 KOLs als Test. Sollte sehen:
```
🔍 X Scanner v2 - Scanning 10 KOLs (from 1137 total)
  ✅ @lookonchain: 3 tweets (2 new crypto mentions)
  ✅ @whale_alert: 3 tweets (1 new crypto mentions)
  ...
✅ Scan complete:
   New crypto mentions: 8
   Coverage: 10/1137 KOLs (0.9%)
```

## 🚀 Regelmäßige Nutzung

### Manual Run (30 KOLs)
```bash
node scanners/x-scanner-v2.mjs
```

### Größere Sample (50 KOLs)
```bash
node scanners/x-scanner-v2.mjs 50
```

### Cron Job (täglich, 30 KOLs)
```bash
crontab -e
# Add:
0 */4 * * * cd /Users/milo/.openclaw/workspace/shared/crypto-scanner && node scanners/x-scanner-v2.mjs 30 >> logs/x-scanner.log 2>&1
```

Das scannt:
- **4x täglich** (alle 6 Stunden)
- **30 KOLs pro Run** = 120 KOLs/Tag
- **~10 Tage** für komplette Rotation durch alle 1,137

## 📊 Output

**Output-Datei:** `data/x-scanner-output.json`

Format:
```json
{
  "scan_time": "2026-03-05T22:30:00Z",
  "total_kols_in_db": 1137,
  "kols_scanned": 30,
  "new_mentions": 12,
  "results": [
    {
      "source": "x:lookonchain",
      "handle": "lookonchain",
      "text": "🐳 Whale bought 1M $BONK...",
      "time": "2026-03-05T22:30:15Z"
    }
  ]
}
```

## 🔗 Integration mit ANALYST

Der ANALYST kann `x-scanner-output.json` lesen und relevante Mentions analysieren.

Optional: Scanner kann direkt zu `pending-alerts.json` schreiben für ANALYST-Pipeline.

## 🛡️ Rate Limiting

Scanner ist rate-limit-safe:
- Random delays (2-3s zwischen KOLs)
- Nur 3 Tweets pro KOL
- Max 50 KOLs pro Run
- Cookies rotieren (nutze mehrere X Accounts falls nötig)

## ❓ Troubleshooting

**"x-cookies.json not found"**
→ Erstelle die Datei wie oben beschrieben

**"Navigation timeout"**
→ X hat Cookies geblockt - hole neue Cookies

**"HTTP 429"**
→ Rate limit - warte 1h, dann mit kleinerer Sample (10-20) testen

**"No tweets found"**
→ KOL-Account ist suspended oder private

---

**Status:** Ready to deploy
**Erstellt:** 2026-03-05
**Version:** 2.0
