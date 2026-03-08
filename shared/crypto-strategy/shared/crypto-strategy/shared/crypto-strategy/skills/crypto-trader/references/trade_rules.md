# Trade Rules and Investment Strategy

## Market Cap Strategy

### Sweet Spot Range
- **Minimum**: $50 Million
- **Maximum**: $500 Million  
- **Reasoning**: Balance between established projects and growth potential

### Market Cap Validation
```python
def validate_market_cap(market_cap):
    MIN_MC = 50_000_000    # $50M
    MAX_MC = 500_000_000   # $500M
    
    if market_cap < MIN_MC:
        return "❌ Too small - higher rug risk"
    elif market_cap > MAX_MC:
        return "❌ Too large - limited growth potential"
    else:
        return "✅ Within target range"
```

## Dual Approval Workflow

### Required Approvers
- **Chris Schulz** (Telegram: 7590333825)
- **Juri** (Telegram: 6162586520)

### Button-Only Approval Process
1. **Research Phase**: Complete fundamental analysis
2. **Button Request**: Send approval request with inline buttons to WEundMILO
3. **Button Clicks**: Both Chris and Juri must click their ✅ buttons
4. **Approval File**: System checks `/private/approvals_COIN.json` for both confirmations
5. **Execution Phase**: Only execute after both button clicks confirmed
6. **Confirmation Phase**: Report execution results to both

### Strict Button Rules
- **NO CHAT INTERPRETATION** - Button clicks only, never text messages
- **NO ASSUMPTIONS** - "sounds good" ≠ button approval
- **NO SHORTCUTS** - Both individual buttons required for every coin
- **REJECT RESETS** - Any ❌ click resets all approvals for that coin
- **ONE COIN = ONE REQUEST** - Separate approval needed per coin

## Trade Sizing Rules

### Position Sizing
- **Standard trade**: $500 - $2,000
- **Large position**: $2,000+ (requires extra justification)
- **Small test**: $100 - $500 (still requires dual approval)

### Balance Management
- **Never exceed** available USDT balance
- **Reserve buffer**: Keep $100 USDT for fees and small opportunities
- **Maximum allocation**: No single coin >20% of total portfolio

## Coin Selection Criteria

### Technical Requirements
- **Listed on MEXC**: Must have USDT trading pair
- **Minimum liquidity**: $50K daily volume
- **Active development**: Recent GitHub commits or updates
- **Clear use case**: Not just meme or speculation

### Research Checklist
- [ ] Market cap within $50M-$500M range
- [ ] Active social media and community
- [ ] Clear roadmap and tokenomics
- [ ] No major red flags or controversies
- [ ] Reasonable entry price (not at ATH)

### Red Flags (Avoid)
- **New coins** <30 days old
- **Anonymous teams** with no track record
- **Excessive marketing** with no substance
- **Pump and dump** patterns in price history
- **Regulatory issues** or legal problems

## Risk Management

### Stop-Loss Strategy
- **Mental stops**: Monitor positions, no automatic stops
- **Cut losses**: If down >50%, strongly consider selling
- **HODL mentality**: But not blind faith - fundamentals must remain

### Diversification
- **Maximum 15 active positions** at once
- **No more than 20%** in any single coin
- **Sector diversification**: DeFi, AI, Gaming, Layer-1, etc.
- **Exchange diversification**: Consider other exchanges if needed

## Execution Rules

### Market Orders Only
- **No limit orders** - execution speed more important than perfect price
- **Accept slippage** - small amounts acceptable for quick execution
- **Monitor fills** - ensure orders execute as expected

### Timing Considerations
- **Market hours**: MEXC is 24/7 but liquidity varies
- **Weekend trading**: Lower volume, wider spreads
- **News events**: Avoid trading during major announcements
- **Technical issues**: Don't trade during exchange maintenance

## Database Update Protocol

### Immediate Updates
After every successful trade:
1. Update `holdings` table with new position
2. Add record to `transactions` table
3. Run `export-data.sh` to sync dashboard
4. Commit and push to GitHub
5. Verify live dashboard shows changes

### Data Integrity
- **Never manually edit** core position data
- **Always use scripts** for consistency
- **Backup before** major changes
- **Verify totals** match exchange balances

## Emergency Procedures

### API Failures
1. **Stop trading** immediately
2. **Check balance** on MEXC web interface
3. **Manual execution** if trade critical
4. **Update database** with actual executed trades
5. **Fix API issues** before resuming automated trading

### Database Corruption
1. **Backup current** state immediately
2. **Cross-reference** with exchange records
3. **Restore from backup** if needed
4. **Verify integrity** before continuing
5. **Document incident** for future prevention

### Approval System Failure
1. **No trades** until system restored
2. **Direct communication** with Chris and Juri
3. **Written confirmation** via alternative channels
4. **Resume only** after explicit permission

## Compliance and Audit

### Transaction Logging
- **Every trade** must be logged with timestamp
- **Include reasoning** for each decision
- **Track performance** vs. expectations
- **Monthly reviews** with Chris and Juri

### Tax Preparation
- **Export quarterly** transaction reports
- **Calculate gains/losses** for each position
- **Maintain receipts** and documentation
- **Coordinate with** accounting team

### Security Audit
- **Quarterly review** of API permissions
- **Check expiration** dates (current: 2026-05-19)
- **Validate access** logs for suspicious activity
- **Update passwords** and 2FA regularly