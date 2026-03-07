# SUB-AGENT POLICY
**Erstellt:** 2026-03-06  
**Autorität:** Chris Schulz (Board)  
**Enforcement:** Milo (CEO)

---

## 🔒 ABSOLUTE REGEL

**Kein Sub-Agent darf eigenständig Änderungen am System vornehmen.**

Alle Änderungen müssen durch Milo (CEO) oder mit expliziter Genehmigung von Chris/Juri erfolgen.

---

## Erlaubte Aktionen (Sub-Agents)

✅ **READ-ONLY:**
- Datenbank lesen
- Files lesen
- Logs analysieren
- Muster erkennen

✅ **BERICHTEN:**
- Findings an Milo
- Vorschläge mit Begründung
- Anomalien melden

---

## Verbotene Aktionen (Sub-Agents)

❌ **WRITE ACCESS:**
- DB schreiben (INSERT/UPDATE/DELETE)
- Code-Dateien ändern
- Scores setzen/ändern
- Files deployen
- Config ändern

❌ **SYSTEM CONTROL:**
- Cron-Jobs erstellen/ändern
- Services starten/stoppen
- Git commits
- Dependencies installieren

---

## Approval Chain

```
Sub-Agent erkennt Problem/Opportunity
    ↓
Reportet an Milo (CEO)
    ↓
Milo prüft Vorschlag
    ↓
Bei Policy-Relevanz: Eskalation an Chris/Juri
    ↓
Nach Genehmigung: Milo führt aus
    ↓
Dokumentation + Git Commit
```

---

## Enforcement

1. **Read-Only DB Connections** für alle Sub-Agents wo technisch möglich
2. **Code Review** vor jedem Sub-Agent Deployment
3. **Audit Trail:** Alle Änderungen werden geloggt (Wer, Was, Wann, Warum)
4. **Sofortige Deaktivierung** bei Verstoß

---

## Incident: 2026-03-06

**Was passiert ist:**
- `asia-social-scanner.mjs` addierte Scores unbegrenzt
- Coins mit Score 20, 33 (statt max 12) in DB
- 376 invalide Einträge
- Governance-Verstoß

**Root Cause:**
- Script lief autonom ohne Oversight
- Keine Score-Validierung
- Keine Approval für Logik-Änderung

**Fix:**
- Scanner deaktiviert
- DB bereinigt
- Validierung eingebaut
- Diese Policy erstellt

---

**NIE WIEDER.**

*Authorisiert: Chris Schulz, 2026-03-06 20:41 EST*
