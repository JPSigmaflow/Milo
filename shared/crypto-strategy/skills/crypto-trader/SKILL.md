---
name: crypto-trader
description: Execute cryptocurrency trades on MEXC exchange with mandatory dual-approval workflow (Chris + Juri). Use when user requests to buy/sell crypto coins, when trade execution is needed, or when portfolio changes are required. Includes API integration, balance validation, and automatic DB updates.
---

# Crypto Trader

This skill provides secure cryptocurrency trading with mandatory dual-approval workflow.

## Core Workflow

**🚨 DUAL-APPROVAL REQUIRED** - NO EXCEPTIONS!

1. **Analyze** - Research coin fundamentals, market cap, price
2. **Propose** - Present trade details to both Chris and Juri
3. **Wait** - Get explicit approval from BOTH parties
4. **Execute** - Run trade script only after dual approval
5. **Update** - Sync database and dashboard automatically

## Quick Start

### 1. Request Button Approval
```bash
python3 scripts/mexc_trader.py request_approval XTZ 1000
```

### 2. Check Approval Status  
```bash
python3 scripts/mexc_trader.py check_approval XTZ
```

### 3. Execute Trade (Only After Dual Approval)
```bash
python3 scripts/mexc_trader.py buy XTZ 1000
```

### 4. Check Balance
```bash
python3 scripts/mexc_trader.py balance
```

## Trade Execution Rules

### Button-Based Approval System
- **NO CHAT INTERPRETATION** - Only explicit button clicks count
- Send approval request with inline buttons to WEundMILO group
- Chris (7590333825) and Juri (6162586520) must both click ✅ 
- Any ❌ REJECT click resets all approvals
- Trade only proceeds after both button confirmations

### Pre-Trade Validation
- Balance sufficient for trade amount
- Symbol exists on MEXC exchange  
- API credentials valid and not expired
- **Both button approvals confirmed in approval file**

### Post-Trade Actions
- Update holdings table in portfolio.db
- Add transaction to transactions table
- Run export-data.sh to sync dashboard
- Commit changes to GitHub repository
- Clean up approval file

## Security Features

- **Dual-Approval**: Both Chris (7590333825) and Juri (6162586520) must approve
- **No Withdrawal**: API keys limited to spot trading only
- **Balance Protection**: Never exceed available USDT
- **Error Handling**: Comprehensive validation and rollback
- **Audit Trail**: All trades logged with timestamps

## Advanced Usage

### Batch Trading
For multiple coin purchases, get approval for entire batch:

```bash
python3 scripts/mexc_trader.py batch_buy coins.json
```

### Market Cap Validation
Check if coin meets our $50M-$500M strategy:

```bash
python3 scripts/mexc_trader.py validate_market_cap SYMBOL
```

## Files Structure

- `scripts/mexc_trader.py` - Main trading script with dual-approval
- `references/api_docs.md` - MEXC API specifications and error codes
- `references/trade_rules.md` - Investment strategy and validation rules

## Emergency Procedures

If trades fail or API issues occur:
1. Check `references/api_docs.md` for error code meanings
2. Validate API key expiration (expires 2026-05-19)
3. Manual fallback via MEXC web interface
4. Update database manually with actual executed trades

## Important Notes

- **Never bypass dual-approval** - Even for small amounts
- **API expires 2026-05-19** - Set reminder for renewal
- **Test mode available** - Use `--dry-run` flag for testing
- **Market hours**: MEXC operates 24/7 but liquidity varies