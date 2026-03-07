# Pump.fun Scanner Upgrade Plan
## Um Coins wie 我的刀盾 zu finden BEVOR sie pumpen

---

## 🔴 PRIORITY 1: Real-Time WebSocket Scanner (CRITICAL!)

### Was fehlt aktuell:
- Wir scannen nur DexScreener (Post-Graduation)
- 15-Min Batches → verpassen Launch-Window
- 我的刀盾 war 6 Tage auf Pump.fun bevor wir ihn hätten sehen können

### Lösung:
**File:** `pumpfun-websocket-scanner.mjs` ✅ CREATED

**Was es tut:**
1. Verbindet zu `wss://pumpportal.fun/api/data`
2. Empfängt JEDEN neuen Token SOFORT bei Launch
3. Quick-Score (0-12) basierend auf:
   - Twitter/Telegram/Website vorhanden? +5
   - Virale Keywords? +2
   - China/Asia Keywords? +2
   - Image? +1
4. Score ≥ 4 → Zu candidates.json hinzufügen
5. Score ≥ 8 → INSTANT ALERT für AI-Review

**Setup:**
```bash
cd /Users/milo/.openclaw/workspace/shared/crypto-scanner
npm install ws
node scanners/pumpfun-websocket-scanner.mjs
```

**Als Daemon:**
```bash
# PM2 oder systemd
pm2 start scanners/pumpfun-websocket-scanner.mjs --name pumpfun-realtime
pm2 save
```

**Ergebnis:**
- 我的刀盾 wäre bei Launch erkannt worden (Twitter + China Keywords = Score 6-8)
- Entry bei $69K statt $2M = 29x statt verpasst

---

## 🟡 PRIORITY 2: Asia Social Scanner

### Problem:
- Wir checken nur Twitter/Reddit
- KEINE BiliBili/Douyin Detection
- 我的刀盾 hatte 1.3M Views auf BiliBili → verpasst

### Lösung:
**File:** `asia-social-scanner.mjs` (TODO)

**APIs zu nutzen:**
1. **BiliBili API:**
   - Endpoint: `https://api.bilibili.com/x/web-interface/search/type`
   - Search für Token Name/Symbol
   - Check Views, Likes, Shares

2. **Douyin (TikTok China):**
   - Keine offizielle API
   - Alternative: Web Scraping oder TikTok International API als Proxy

3. **Weibo API:**
   - `https://open.weibo.com/wiki/2/search/topics`
   - Trending Topics

**Integration:**
- Läuft alle 30 Min
- Für JEDEN Pump.fun Token in candidates.json:
  - Search auf BiliBili/Douyin/Weibo
  - Views > 500K? → +3 Score
  - Trending? → +2 Score
- Update candidates.json mit socialViews

**Ergebnis:**
- 我的刀盾 wäre von Score 6 auf Score 11 gestiegen (904K BiliBili Views)
- INSTANT ALERT ausgelöst

---

## 🟢 PRIORITY 3: Cron Job Anpassung

### Aktuell:
```javascript
// PumpWatch Scanner alle 15 Min
schedule: { kind: "every", everyMs: 900000 }
```

### Neu:
```javascript
// WebSocket läuft DAUERHAFT
// Cron nur noch für AI-Bewertung der candidates.json

// ANALYST Job: Alle 30 Min
- Liest candidates.json
- Bewertet NUR neue Kandidaten (Score >= 6)
- Vollständige 12-Kriterien-Analyse
- Score ≥ 10 → INSTANT ALERT
```

**Änderung in Cron:**
```json
{
  "name": "PumpWatch — AI Evaluator",
  "schedule": { "kind": "every", "everyMs": 1800000 },
  "payload": {
    "message": "Bewerte NEUE Kandidaten aus pumpfun-candidates.json. Quick-Score bereits vorhanden. Mache FULL 12-Kriterien-Analyse für alle mit Score >= 6. Bei Score >= 10: INSTANT ALERT an WEundMILO."
  }
}
```

---

## 🔵 PRIORITY 4: MC Filter lockern

### Problem:
```javascript
const MAX_MC = 500000; // $500K max
```
→ 我的刀盾 hatte $2M MC bei Graduation → rausgefiltert

### Lösung:
**Zwei-Stufen-Filter:**
```javascript
// Stufe 1: Ultra-Early (<$500K)
const ULTRA_EARLY_MC = 500000;

// Stufe 2: Momentum Plays ($500K - $5M)
const MOMENTUM_MC = 5000000;

if (mc < ULTRA_EARLY_MC) {
  category = 'ultra_early';
  alert_threshold = 8; // Lower threshold
} else if (mc < MOMENTUM_MC) {
  category = 'momentum';
  alert_threshold = 10; // Higher threshold
}
```

**Ergebnis:**
- Mehr Coverage ohne Noise
- 我的刀盾 bei $2M wäre als "momentum play" mit Score 10 gemeldet worden

---

## 🟣 PRIORITY 5: MEXC Candidate Detector

### Zusatz-Modul:
**File:** `mexc-candidate-scorer.mjs` (TODO)

**Für jeden Token in DB:**
```javascript
function getMEXCListingScore(token) {
  let score = 0;
  
  // Base criteria
  if (token.isPumpFun) score += 2;
  if (token.daysOld >= 3 && token.daysOld <= 7) score += 2;
  if (token.volume24h > 1000000) score += 2;
  if (token.txns24h > 10000) score += 1;
  if (token.liquidityRatio > 0.05) score += 1;
  
  // Asia signals
  if (token.hasBiliBiliViews > 500000) score += 2;
  if (token.hasAsianNarrative) score += 1;
  
  return score; // 0-11
}

// Score >= 8: "High probability MEXC listing in 2-4 days"
```

**Integration:**
- Läuft täglich
- Erstellt "MEXC Watch List"
- Alert bei Score 8+: "Prepare for MEXC listing"

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Quick Wins (2-3h)
- [x] WebSocket Scanner erstellt
- [ ] `npm install ws` in scanner folder
- [ ] PM2/systemd setup
- [ ] Test mit live Pump.fun launches

### Phase 2: Social Signals (1 Tag)
- [ ] BiliBili API integration
- [ ] Weibo API integration
- [ ] Douyin scraper (oder skip)
- [ ] Social scorer in candidates.json

### Phase 3: Cron Refactor (2h)
- [ ] WebSocket als daemon
- [ ] ANALYST Cron auf 30-Min
- [ ] MC Filter anpassen
- [ ] Alert-Logic updaten

### Phase 4: MEXC Predictor (1 Tag)
- [ ] MEXC scoring function
- [ ] Watch List generator
- [ ] Daily MEXC candidate report

---

## 🎯 ERWARTETES ERGEBNIS

### Vorher (aktueller Zustand):
- 我的刀盾 bei $2M MC entdeckt (zu spät)
- 6 Tage nach Launch
- Entry-Window verpasst

### Nachher (mit Upgrades):
- **Day 1:** WebSocket Alert bei Launch ($69K MC)
- **Day 2-3:** Asia Social Scanner erhöht Score auf 10+
- **Day 4:** MEXC Candidate Score 8+ → "Listing wahrscheinlich"
- **Day 6:** MEXC listet → wir sind bereits drin bei $69K Entry
- **Profit:** 29x statt verpasst

---

## 💰 ROI KALKULATION

**Ein einziger Catch wie 我的刀盾:**
- Entry: $500 @ $69K MC
- Exit: $14,500 @ $2M MC (vor CEX-Listing)
- Profit: $14,000 = 29x

**Mit CEX-Pump:**
- Exit: $43,500 @ $6M MC (nach MEXC +300%)
- Profit: $43,000 = 86x

**Dev-Zeit:** 2-3 Tage (WebSocket + Social + Cron)
**Payoff:** Ein Trade = ROI

---

*Erstellt: 3. März 2026*
*Basierend auf: 我的刀盾 Case Study*
