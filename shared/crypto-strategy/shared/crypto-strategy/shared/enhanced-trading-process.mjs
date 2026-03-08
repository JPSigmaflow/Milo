#!/usr/bin/env node
/**
 * ENHANCED TRADING PROCESS - mit MANDATORY RECONCILIATION
 * Kein Trade ohne Post-Trade-Reconciliation!
 */

import { TradingSecurity } from './trading-security.mjs';
import { PostTradeReconciliation } from './post-trade-reconciliation.mjs';

class EnhancedTradingProcess {
  constructor() {
    this.reconciler = new PostTradeReconciliation();
  }

  /**
   * COMPLETE TRADE PROCESS - mit allen Safeguards
   */
  async executeTrade(symbol, amount, confirmId, tradeType = 'BUY') {
    let orderHash = null;
    let mexcResult = null;

    try {
      console.log(`🔒 STARTING ENHANCED TRADE: ${symbol} ${amount}`);

      // PHASE 1: PRE-TRADE SECURITY VALIDATION
      orderHash = await TradingSecurity.validateTrade(symbol, amount, confirmId);
      console.log(`✅ Security validation passed: ${orderHash}`);

      // PHASE 2: EXECUTE MEXC TRADE
      mexcResult = await this.executeMexcOrder(symbol, amount, tradeType);
      console.log(`✅ MEXC trade executed: ${mexcResult.orderId}`);

      // PHASE 3: IMMEDIATE DB UPDATE
      await this.updatePortfolioDB(symbol, mexcResult);
      console.log(`✅ Portfolio DB updated`);

      // PHASE 4: MANDATORY POST-TRADE RECONCILIATION
      console.log(`🔍 Starting mandatory reconciliation...`);
      const discrepancies = await this.reconciler.reconcileAfterTrade(symbol, amount);
      
      if (discrepancies.length > 0) {
        console.log(`⚠️  Reconciliation fixed ${discrepancies.length} discrepancies`);
      } else {
        console.log(`✅ No discrepancies found`);
      }

      // PHASE 5: COMPLETE TRADE SUCCESS
      TradingSecurity.completeTrade(symbol, true);
      
      console.log(`🎯 ENHANCED TRADE COMPLETE: ${symbol}`);
      return {
        success: true,
        mexcResult,
        discrepancies: discrepancies.length,
        orderHash
      };

    } catch (error) {
      console.error(`❌ ENHANCED TRADE FAILED: ${error.message}`);
      
      // Cleanup on failure
      if (orderHash) {
        TradingSecurity.completeTrade(symbol, false);
      }

      // Still try reconciliation even on failure
      try {
        await this.reconciler.reconcileAfterTrade(symbol + '_FAILED');
      } catch (reconError) {
        console.error(`Reconciliation also failed: ${reconError.message}`);
      }

      throw error;
    }
  }

  /**
   * Execute MEXC Order via API
   */
  async executeMexcOrder(symbol, amount, type) {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const mexcSymbol = symbol + 'USDT';
    const orderType = type === 'BUY' ? 'BUY' : 'SELL';
    const quantityParam = type === 'BUY' ? 'quoteOrderQty' : 'quantity';

    const command = `
      ACCESS_KEY="mx0vglPqN8IwDPj4N0"
      SECRET_KEY="817579cb761b4793a2fd4bd6cdc7a7cf"
      TIMESTAMP=$(date +%s000)
      
      QUERY_STRING="symbol=${mexcSymbol}&side=${orderType}&type=MARKET&${quantityParam}=${amount}&timestamp=$TIMESTAMP"
      SIGNATURE=$(echo -n "$QUERY_STRING" | openssl dgst -sha256 -hmac "$SECRET_KEY" | cut -d' ' -f2)
      
      curl -s -X POST "https://api.mexc.com/api/v3/order?$QUERY_STRING&signature=$SIGNATURE" \\
        -H "X-MEXC-APIKEY: $ACCESS_KEY" \\
        -H "Content-Type: application/json"
    `;

    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout);

    if (result.orderId) {
      return result;
    } else {
      throw new Error(`MEXC order failed: ${JSON.stringify(result)}`);
    }
  }

  /**
   * Update Portfolio DB immediately after trade
   */
  async updatePortfolioDB(symbol, mexcResult) {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // This is now redundant since reconciliation will fix any issues,
    // but we keep it for immediate feedback
    
    const executedQty = parseFloat(mexcResult.executedQty || mexcResult.origQty || 0);
    const avgPrice = parseFloat(mexcResult.price || 0.001);

    if (executedQty > 0) {
      await execAsync(`
        sqlite3 shared/portfolio.db "
        INSERT OR REPLACE INTO holdings (
          symbol, name, amount, entry_price, exchange, chain, 
          contract_address, coinpaprika_id, status, entry_date, 
          current_price, updated_at
        ) VALUES (
          '${symbol}', '${symbol}', ${executedQty}, ${avgPrice}, 'MEXC', 'Unknown',
          'TBD', '${symbol.toLowerCase()}-tbd', 'active', date('now'), 
          ${avgPrice}, datetime('now')
        );
        "
      `);

      // Log transaction
      await execAsync(`
        sqlite3 shared/portfolio.db "
        INSERT INTO transactions (
          coin, type, amount, price_usd, total_usd, exchange, tx_date, notes, created_at
        ) VALUES (
          '${symbol}', 'BUY', ${executedQty}, ${avgPrice}, ${executedQty * avgPrice}, 
          'MEXC', date('now'), 'Enhanced trading process', datetime('now')
        );
        "
      `);
    }
  }

  /**
   * PERIODIC HEALTH CHECK - runs independently
   */
  async periodicHealthCheck() {
    try {
      const isHealthy = await this.reconciler.quickHealthCheck();
      if (!isHealthy) {
        console.log(`⚠️  Health check found discrepancies - auto-corrected`);
      }
      return isHealthy;
    } catch (error) {
      console.error(`❌ Health check failed: ${error.message}`);
      return false;
    }
  }
}

export { EnhancedTradingProcess };

/**
 * MANDATORY USAGE:
 * 
 * const trader = new EnhancedTradingProcess();
 * 
 * // Every trade MUST use this process
 * await trader.executeTrade('STORJ', 600, 'CHRIS_JURI_20260219');
 * 
 * // Periodic health monitoring
 * setInterval(async () => {
 *   await trader.periodicHealthCheck();
 * }, 1800000); // Every 30 minutes
 */