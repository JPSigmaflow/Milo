# DEPLOYMENT CHECKLIST
## Nach jedem Dashboard-Update PFLICHT!

### ✅ 1. DATA VALIDATION
```bash
# Prüfe Export
cd /Users/milo/.openclaw/workspace/shared/crypto-dashboard
python3 -c "
import json
with open('data.json', 'r') as f:
    data = json.load(f)
print(f'✅ {len(data[\"transactions\"])} transactions exported')
print(f'✅ Last export: {data[\"exported_at\"]}')
print(f'✅ USDT free: ${data[\"usdt_free\"]:.2f}')
"
```

### ✅ 2. GIT SYNC CHECK
```bash
# Prüfe Git Status
git status --porcelain
git log --oneline -1
git push --dry-run
```

### ✅ 3. DASHBOARD LIVE TEST
- Browser: `jpsigmaflow.github.io`
- Hard refresh: `Ctrl+F5` 
- Check: Letzte Transaktion sichtbar?
- Check: Prüfsumme korrekt?

### ✅ 4. TIMING VALIDATION
- Export timestamp in data.json
- Commit timestamp in Git
- Müssen <2 Minuten auseinander liegen

### ❌ STOP CONDITIONS
- Data.json älter als 10 Minuten
- Git Push failed
- Dashboard zeigt falsche Summen

## AUTOMATION RULES
1. **JEDER Trade** → SOFORT export-data.sh
2. **JEDE Änderung** → Validation vor Git Push  
3. **JEDER Deploy** → Live Test innerhalb 5 Min