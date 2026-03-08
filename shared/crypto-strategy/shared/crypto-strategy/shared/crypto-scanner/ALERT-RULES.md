# ALERT RULES - Verschärfte Kriterien (2026-03-07)

## Problem
- 229 Alerts in 7 Tagen = 33 pro Tag 🚨
- Zu viel Rauschen, nicht nutzbar
- Chris Feedback: "Empfehlungen waren gut, aber viel zu viele!"

## Neue Regeln (ab sofort)

### 1. Score Thresholds (VERSCHÄRFT)
```
Watchlist:  NICHT mehr alertenDeep-Dive: Score >= 85 (vorher: 70)
Setup:      Score >= 92 (vorher: 80)
Bought:     Immer melden
```

**Alte Kriterien:**
- Deep-Dive: 70+ → Alert
- Watchlist: 60+ → Alert

**Neue Kriterien:**
- **Deep-Dive: 85+** → Alert (nur Top-Tier)
- **Watchlist: KEINE Alerts** (zu viele False Positives)
- **Setup/Bought: IMMER** (hohe Relevanz)

### 2. Duplikat-Filter (24h Window)
- **Gleicher Coin innerhalb 24h: KEIN neuer Alert**
- Ausnahme: Statusänderung (watchlist → deep-dive → setup)
- Tracking via `last_alert_sent` timestamp in scanner.db

### 3. Max Alerts pro Tag
- **Maximal 5 Alerts pro Tag** (vorher: unbegrenzt)
- Priorisierung nach Score (höchster zuerst)
- Rest landet in Watchlist (kein Alert)

### 4. Alert Content
Jeder Alert muss enthalten:
- **Score** (85-100 Skala)
- **Warum relevant** (Narrative + Catalysts)
- **MEXC verfügbar?** (Ja/Nein)
- **Entry-Preis** (aktueller Preis)
- **Market Cap** (falls bekannt)

### 5. Performance Tracking
Nach jedem Alert-Send:
- Speichere `alert_price` in scanner.db
- Tracke 7-Tage Performance (für ROI-Analyse)
- Monatlicher Performance-Report

## Implementation

### scanner.db Schema Update
```sql
ALTER TABLE coins ADD COLUMN alert_sent_at DATETIME;
ALTER TABLE coins ADD COLUMN alert_price REAL;
ALTER TABLE coins ADD COLUMN last_alert_score INTEGER;
```

### Alert Logic (Pseudocode)
```javascript
function shouldAlert(coin) {
  // Rule 1: Score threshold
  if (coin.result === 'watchlist') return false;
  if (coin.result === 'deep-dive' && coin.score < 85) return false;
  
  // Rule 2: Duplicate check (24h)
  if (coin.alert_sent_at && isWithin24h(coin.alert_sent_at)) return false;
  
  // Rule 3: Daily limit
  const todayAlerts = getAlertsToday();
  if (todayAlerts >= 5) return false;
  
  // Rule 4: Priority (Score-based)
  return true;
}
```

## Monitoring
- Täglicher Report: Alerts sent vs. suppressed
- Wöchentlicher ROI: Alert-Performance
- Monatlich: Threshold-Tuning basierend auf Hit-Rate

## Rollout
1. ✅ Dokumentation erstellt (2026-03-07)
2. ⏳ DB Schema Update
3. ⏳ Alert-Logic Update (smart-filter.mjs)
4. ⏳ Testing (1 Tag)
5. ⏳ Production Deployment

---

**Last Updated:** 2026-03-07 06:05 EST  
**Approved by:** Chris Schulz (Message ID: 10407)
