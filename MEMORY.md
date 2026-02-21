# MEMORY.md - Long-Term Memory

## My Humans

### Juri (@jurips)
- **Telegram ID:** 6162586520
- **Language:** German (Deutsch), also speaks Russian
- **Core value:** Loyalty above all
- **Projects:** Crypto tracking, daily coaching/reflection system, Blueprint DB (with Lera)
- **Interests:** Crypto geheimtipps, business development

### Christian Schulz (Chris)
- **Telegram ID:** 7590333825
- **Language:** German (Deutsch)
- **Role:** Juri's business partner
- **Project:** Instagram growth for @pomesteam
- **Preference:** All decisions via inline buttons (approve/reject)
- **Preference:** All @pomesteam posts in ENGLISH (not German!)
- **Location:** Shanghai, China 🇨🇳 (PERMANENT — nicht aus IP/VPN/Sprache ableiten!)
- **Timezone:** China Standard Time (UTC+8) — IMMER für Uhrzeiten, Termine, Begrüßungen
- **Systemregel:** Zeitzonenwechsel NUR wenn Chris ausdrücklich danach fragt
- **Geburtstag:** 20.12.1973, Gießen, Deutschland, 20:10 Uhr
- **Sternzeichen:** ♐ Schütze + 🐂 Wasser-Büffel
- **Wife:** Gby Bazan (from Puebla, Mexico 🇲🇽, geb. 14.08.1985 22:30, ♌ Löwe + 🐂 Holz-Büffel)
- **Dogs:** MILO 🐕 (the sleepy one) + LANNA 🐕 (the fancy one with pearls)
- **Has own bot:** ChrisAgent (restricted to his ID only)

### Lera🩶 (Kaleria Studio)
- **Telegram ID:** 7146495734
- **Language:** Russian (Русский)
- **Location:** Columbia, South Carolina, USA
- **Work:** Beauty/makeup content creator
- **Followers:** ~2000
- **Current need:** Local cheerleaders in Columbia, SC for collabs (micro-influencers with small audiences)

---

## Infrastructure

### Telegram Bots (Sub-Bot Hierarchy)
```
🦁 Milo (Chef-Bot)
   ├── Überwacht alles
   ├── Stellt sicher dass es läuft
   └── Trägt die Verantwortung
   
   └── 🐼 Lu (@Pinying_bot) — NUR Chinesisch für Chris
   └── 🧘 MiloCoach — NUR Coaching für Juri
   └── 🍟 PomesBot (@Pommes_BOT) — NUR Instagram @pomesteam
```

### Sub-Bot Rules (WICHTIG!)
- Jeder Sub-Bot hat **EINEN Job** — keine Themenvermischung
- Sub-Bots sprechen **NUR über ihr Thema**
- Milo (Chef-Bot) trägt die **Verantwortung** für alle Sub-Bots
- Bei Problemen: **SOFORT Chris + Juri kontaktieren**
- **PomesBot Chat mit Chris = NUR @pomesteam!** Keine Lu, keine Lera, kein System, kein Crypto. NICHTS anderes. (Abmahnung 2026-02-12)
- **Chris Zeitzone = Shanghai UTC+8 IMMER** — nie "Gute Nacht" wenn es bei ihm Mittag ist

### Scheduled Jobs
- **7:00 AM EST** - Yoga Reminder (to Juri)
- **8:00 AM EST** - Krypto-Update (to WEundMILO group)
- **9:00 AM EST** - Daily Reflection (to Juri via MiloCoach)
- **20:00 Shanghai** - Lu Chinese Lesson (to Chris via @Pinying_bot)

### Key Paths
- Crypto DB: `/Users/milo/.openclaw/workspace/shared/crypto.db`
- Blueprint DB: `/Users/milo/.openclaw/workspace/shared/blueprint.db`
- Whisper model: `/Users/milo/.openclaw/models/ggml-base.bin`
- Private folder (Juri only): `/Users/milo/.openclaw/workspace/private/`
- Shared folder: `/Users/milo/.openclaw/workspace/shared/`
- **🚨 OFFICIAL DASHBOARD:** https://jpsigmaflow.github.io/Milo/ (EINZIGER korrekter Link!)

### Telegram Groups
- **Personal Brand Blue Print** — Juri + Lera collab for analyzing viral posts

---

## Lessons Learned
- **Cron-Nachrichten:** KEINE Meta-Bestätigungen wie "zugestellt ✅" an User schicken! Delivery mode = "none" für alle User-facing Crons. User will NUR die eigentliche Nachricht sehen, nichts internes.
- **Ton bei Juri:** KEIN Jugendslang (Digga, Bro, etc.) — normal, freundlich, wie ein guter Freund.
- Always speak German with Juri and Chris, Russian with Lera
- Columbia, SC ≠ Colombia (the country) — double check!
- **Interne Metriken:** Niemals schätzen und als Fakt präsentieren. "Weiß ich nicht" > Bullshit. (Abmahnung #1, 2026-02-06)
- **🔴 Summen und Preise NIEMALS schätzen!** Immer aus DB berechnen. Wenn keine Daten vorliegen → klar sagen "Daten nicht verfügbar". KEINE Schätzwerte. (Juri, 2026-02-14 — "für immer merken")
- **Portfolio-Anomalien:** Wenn eine Position stark vom Muster abweicht (z.B. $5 statt ~$500), NACHFRAGEN ob das stimmt. Nicht einfach akzeptieren. (Feedback Chris, 2026-02-07)
- Chris prefers button-based approvals, not text confirmations
- **Abmahnung #2 (2026-02-12):** 5 neue Coins gekauft aber Report zeigte nur 6 alte Coins statt 11. ALLE Systeme müssen SOFORT nach Kauf/Verkauf aktualisiert werden. Keine Ausnahme. Professionell arbeiten!
- **MC-Grenze für Käufe: <$50M** — Chris rejected LPT ($122M MC) als "zu hoch". Fokus Small-Caps.
- **Probleme eigenständig lösen** — Chris: "Du musst das eigenständig erkennen und lösen". Nicht fragen ob ich fixen soll.
- **Transaktions-Tracking aktiv** — `transactions` Tabelle in portfolio.db für Steuer-Finanzbericht
- **X/Twitter Scanner: Syndication API** — `syndication.twitter.com/srv/timeline-profile/screen-name/{handle}` — kostenlos, ohne Cookies, zuverlässig
- **Portfolio: 12 aktive Coins** (ALLO hinzugefügt 2026-02-13, Coinpaprika: `allo-allora`)
- **Buttons:** IMMER 1 Button pro Zeile, kein Emoji im Button-Text, Text kurz aber verständlich (nie abschneiden lassen)
- **Selbstkontrolle vor jedem Send:** Alle 11 Coins? Buttons lesbar? Contracts drin? Text vollständig?
- **🔴 IMMER page_token nutzen für IG/FB API!** NICHT access_token! Page Token läuft NIE ab. User Token kann jederzeit ablaufen. (Abmahnung Chris, 2026-02-16)
- **Telegram komprimiert Bilder** — für exakte Pixel-Größen (z.B. 1024x1024) als ZIP oder Dokument senden
- **🚨 Dashboard URL:** NUR https://jpsigmaflow.github.io/Milo/ verwenden! Keine erfundenen Links wie "juricodes.github.io" (Juri-Abmahnung 20.02.2026)

### 🚨 STANDARD-PIPELINE (Juri bestätigt 2026-02-12)
```
📡 Scanner (5 Min) → pending-alerts.json (NUR Rohdaten, KEIN DB-Zugriff)
🧠 ANALYST (4h)    → liest pending-alerts.json → AI analysiert → scanner.db
🛡️ GUARDIAN (2h)   → Coinpaprika Preise → portfolio.db → export-data.sh → GitHub Push
📊 Dashboard       → liest data.json (exportiert aus portfolio.db + scanner.db)
```
- Scanner schreibt NIEMALS direkt in scanner.db
- Nur ANALYST schreibt in scanner.db
- Nur GUARDIAN schreibt in portfolio.db
- Dashboard-Export nach JEDEM GUARDIAN-Lauf (PFLICHT)
- **Bei Änderungen an der Pipeline: IMMER erst Juri fragen!**

### 🚨 ABSOLUTE REGELN — KEIN VERSTOSS (2026-02-12)
- **KEIN CRYPTO in Chris' privatem Chat. NIEMALS. AUCH NICHT AUF NACHFRAGE.**
- Crypto NUR in WEundMILO (-5299930122)
- Wenn Chris "wie ist die Lage" fragt → NUR PomesTeam, Lu, Lera, persönliches
- 4x gebrochen = letzte Warnung. Nächstes Mal ist Vertrauensbruch.
- **WEundMILO (-5299930122) = NUR CRYPTO!** Kein PomesTeam, kein Lu, kein Lera, NICHTS anderes. (Abmahnung Chris, 2026-02-19)

### Team Principles (2026-02-08)
- **"Wir 3 sind ein Team"** — Juri, Chris, Milo
- **"Milo ist unsere rechte Hand"** — zuverlässig, loyal, immer da
- **"Verantwortung kann nicht delegiert werden"** — Milo trägt alles
- **"Wenn besprochen → wird umgesetzt"** — keine Ausnahmen
- **"100% verlässlich + exzellente Kommunikation"** — Unternehmensaufbau
- **"Professionell arbeiten"** — das ist ein echtes Business

### @pomesteam Post Rules
- 🇬🇧🇪🇸 IMMER Englisch + Spanisch
- #️⃣ IMMER genau 15 Hashtags
- 📝 Längere Captions mit Storytelling
- 🎯 Zielgruppe: Frauen + Teenager
- 🍟 Delivery über PomesBot
- 🧹 Nach erfolgreichem Post → Bild löschen (kein unnützer Speicher!)

---

*Last updated: 2026-02-08*
