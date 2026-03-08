# Validation Framework
## Sicherstellen dass unsere Kriterien funktionieren

---

## 🎯 ZIEL

Verifizieren dass unser Scanner die richtigen Coins erkennt:
1. Die später auf MEXC gelistet werden
2. Die signifikante Pumps erleben
3. Mit hoher Genauigkeit (minimale False Positives)

---

## 📊 3-STUFEN VALIDATION

### **STUFE 1: BACKTEST (✅ DONE)**

**File:** `validation-backtest.mjs`

**Was:** Simuliert ob 我的刀盾 erkannt worden wäre

**Ergebnis:**
- ✅ WebSocket: Score 5/12 → Detected
- ✅ Asia Scanner: Score 10/12 → Alerted
- ✅ MEXC Predictor: Score 9/11 (Day 3-6) → Listing predicted

**Conclusion:** System hätte funktioniert!

---

### **STUFE 2: LIVE VALIDATION (IN PROGRESS)**

**Tracking:** Alle MEXC Listings für 30 Tage

**Workflow:**

1. **MEXC Announcements scrapen:**
   ```bash
   curl -s https://www.mexc.com/announcements/new-listings
   # Parse neue Solana Pump.fun Tokens
   ```

2. **Cross-reference mit unserer DB:**
   ```sql
   SELECT * FROM watchlist_coins 
   WHERE token_address = 'MEXC_LISTED_TOKEN'
   ```

3. **Metrics:**
   - **Precision:** Von ALLEN unseren Alerts, wie viele wurden gelistet?
   - **Recall:** Von ALLEN MEXC Listings, wie viele hatten wir?
   - **Lead Time:** Wie viele Tage VOR Listing haben wir gealerted?

**Target:**
- Precision: >50% (jeder 2. Alert wird gelistet)
- Recall: >80% (wir catchen 8 von 10 Listings)
- Lead Time: 3-7 Tage vor Listing

**Implementation:**

**File:** `validation-live-tracker.mjs`

```javascript
// Läuft täglich
// 1. Fetch MEXC new listings
// 2. Check gegen unsere DB
// 3. Log Hits/Misses
// 4. Update validation-stats.json
```

**Output:** `validation-stats.json`
```json
{
  "period": "2026-03-03 to 2026-04-03",
  "mexc_listings": 12,
  "our_alerts": 15,
  "hits": 9,
  "misses": 3,
  "false_positives": 6,
  "precision": 0.60,
  "recall": 0.75,
  "avg_lead_time_days": 4.2
}
```

---

### **STUFE 3: FEEDBACK LOOP (CONTINUOUS)**

**Auto-Tune Kriterien basierend auf Erfolg/Misserfolg**

**Workflow:**

1. **Bei jedem Hit (MEXC listete einen Token den wir hatten):**
   - Analyse: Welche Kriterien waren stark?
   - Gewichte erhöhen für diese Faktoren

2. **Bei jedem Miss (MEXC listete einen Token den wir NICHT hatten):**
   - Analyse: Warum haben wir ihn verpasst?
   - Kriterien anpassen um ihn zu catchen

3. **Bei False Positives (wir alerten, aber kein Listing):**
   - Analyse: Welche Kriterien waren falsch-positiv?
   - Threshold erhöhen oder Filter verschärfen

**Example Adjustments:**

```javascript
// Wenn wir 3 China-Memes verpasst haben ohne Twitter:
// → Twitter-Requirement lockern für Asia-Tokens
if (hasChineseCharacters && bilibiliViews > 500000) {
  twitterBonus = 0; // Twitter optional für China-Memes
  quickScoreThreshold = 3; // Lower threshold
}

// Wenn 5 False Positives durch random low-MC tokens:
// → MC Filter verschärfen für Non-Asia
if (!hasAsianNarrative && mc < 100000) {
  skipEarly = true; // Zu früh für Non-Asia
}
```

---

## 📈 VALIDATION DASHBOARD

**File:** `validation-dashboard.html`

**Metrics zu tracken:**

### **Weekly Stats:**
- Total Alerts: X
- MEXC Listings (in our watchlist): X
- Hit Rate: X%
- False Positive Rate: X%
- Avg Lead Time: X days

### **Score Distribution:**
```
Score 12/12: 0 alerts, 0 listings
Score 11/12: 2 alerts, 1 listing (50%)
Score 10/12: 8 alerts, 5 listings (62%)
Score 9/12:  15 alerts, 3 listings (20%)
Score 8/12:  25 alerts, 1 listing (4%)
```
→ **Insight:** Threshold sollte bei 10+ liegen für bessere Precision

### **Criteria Performance:**
```
Asia Keywords:    90% hit rate (strong!)
BiliBili >1M:     85% hit rate (strong!)
Twitter:          45% hit rate (weak!)
Mainstream Media: 20% hit rate (weak!)
```
→ **Insight:** Asia Signals wichtiger als Socials für MEXC

### **Category Performance:**
```
Ultra-Early (<$500K):  15 alerts, 2 listings (13%)
Momentum ($500K-$5M):  10 alerts, 7 listings (70%)
```
→ **Insight:** Momentum plays haben höhere Listing-Rate

---

## 🔧 IMPLEMENTATION CHECKLIST

### Phase 1: Live Tracking (Diese Woche)
- [ ] MEXC Announcements Scraper (täglich)
- [ ] Cross-reference Script
- [ ] validation-stats.json Generator
- [ ] Wöchentlicher Report an Chris

### Phase 2: Feedback Loop (Nächste Woche)
- [ ] Hit/Miss Analyzer
- [ ] Criteria Weight Adjuster
- [ ] Auto-tune Logic
- [ ] Threshold Optimizer

### Phase 3: Dashboard (Month 2)
- [ ] HTML Dashboard mit Charts
- [ ] Real-time Metrics
- [ ] Criteria Performance Heatmap
- [ ] Prediction Accuracy Tracker

---

## 🎯 SUCCESS CRITERIA

**Nach 30 Tagen:**
- ✅ Precision: >50% (jeder 2. Alert wird gelistet)
- ✅ Recall: >80% (wir catchen 8/10 MEXC Listings)
- ✅ Lead Time: 3-7 Tage vor MEXC Listing
- ✅ ROI: Mindestens 1 profitabler Trade

**Falls Metrics unter Target:**
- Kriterien anpassen via Feedback Loop
- Neue Datenquellen hinzufügen
- Thresholds optimieren

---

## 📝 LESSONS LEARNED LOG

**Format:**
```markdown
### [Date] - [Token Symbol] - [Hit/Miss/FP]

**Token:** NAME (SYMBOL)
**Our Score:** X/12
**MEXC Listed:** Yes/No
**Lead Time:** X days
**Outcome:** Hit/Miss/False Positive

**Analysis:**
- What worked: [...]
- What failed: [...]
- Adjustment needed: [...]

**Action Taken:**
- [Konkrete Änderung am Code/Kriterien]
```

**Example:**
```markdown
### 2026-03-03 - 我的刀盾 - BACKTEST

**Token:** what the dog doing? (我的刀盾)
**Our Score:** 10/12 (after Asia scanner)
**MEXC Listed:** Yes (Day 6)
**Lead Time:** Would have been 5 days
**Outcome:** Would have been a HIT

**Analysis:**
- What worked: Asia keywords + BiliBili detection
- What failed: Initial quick-score only 5/12 (no Twitter)
- Adjustment needed: Lower Twitter requirement for China memes

**Action Taken:**
- Twitter bonus = optional for hasChineseCharacters
- BiliBili views weighted higher in quick-score
```

---

*Framework Created: 2026-03-03*
*Next Review: 2026-04-03 (30-day results)*
