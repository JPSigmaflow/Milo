# Crypto Trader - Usage Examples

## Quick Commands

### Check Balance
```bash
cd skills/crypto-trader
python3 scripts/mexc_trader.py balance
```

### Test Trade (Dry Run)
```bash
cd skills/crypto-trader  
python3 scripts/mexc_trader.py buy XTZ 1000 --dry-run
```

### Real Trade (After Dual Approval)
```bash
cd skills/crypto-trader
python3 scripts/mexc_trader.py buy XTZ 1000
```

## Dual Approval Workflow

1. **Research Phase**
   ```
   🔍 Analyze XTZ: $0.385, MC $414M ✅
   📊 Within our $50M-$500M strategy
   ```

2. **Request Phase**
   ```
   📨 Send to WEundMILO group:
   "🔔 TRADE APPROVAL: XTZ $1000 
   Chris ✅? Juri ✅?"
   ```

3. **Approval Phase**
   ```
   ✅ Chris: Approved
   ✅ Juri: Approved
   → Both confirmed, proceed
   ```

4. **Execution Phase**
   ```bash
   python3 scripts/mexc_trader.py buy XTZ 1000
   ```

5. **Confirmation Phase**
   ```
   ✅ Trade executed: 2,597 XTZ @ $0.385
   ✅ Database updated
   ✅ Dashboard synced
   ```

## Security Features

- ✅ **API Keys expire**: 2026-05-19
- ✅ **No withdrawal permissions**: Spot trading only  
- ✅ **Balance validation**: Never exceed available USDT
- ✅ **Dual approval**: Both Chris + Juri required
- ✅ **Audit trail**: All trades logged with timestamps

## Error Handling

### API Issues
```
❌ Error: Invalid content Type
→ Check references/api_docs.md for troubleshooting
```

### Balance Issues  
```
❌ Insufficient balance: $100.00 < $1000
→ Check actual balance, reduce trade size
```

### Approval Issues
```
🛡️ DUAL APPROVAL REQUIRED
⏸️ Trade paused - awaiting approval
→ Get explicit approval from both parties
```

## Next Steps

Once tested and approved:
1. Update MEMORY.md with skill location
2. Set cron reminder for API renewal (2026-05-19)
3. Train both Chris and Juri on approval workflow
4. Create backup procedures for manual trading