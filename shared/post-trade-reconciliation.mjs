#!/usr/bin/env node
/**
 * POST-TRADE RECONCILIATION SYSTEM
 * MANDATORY nach jedem Trade - keine Ausnahmen!
 * 
 * Implementiert nach STORJ DB-Inkonsistenz vom 2026-02-19
 * Chris Requirement: "Werte in der DB, Bilanz usw. werden hinterfragt"
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

class PostTradeReconciliation {
  constructor() {
    this.logFile = './trade-reconciliation.log';
    this.criticalThreshold = 0.01; // 1% difference = critical
  }

  /**
   * MAIN RECONCILIATION ROUTINE
   * Must be called after EVERY trade
   */
  async reconcileAfterTrade(tradeSymbol, expectedAmount = null) {
    console.log(`🔍 POST-TRADE RECONCILIATION: ${tradeSymbol}`);
    console.log(`==========================================`);
    
    const startTime = Date.now();
    const discrepancies = [];

    try {
      // Step 1: Get MEXC Reality
      const mexcBalances = await this.getMexcBalances();
      
      // Step 2: Get DB State  
      const dbBalances = await this.getDbBalances();
      
      // Step 3: Compare ALL balances
      const allSymbols = new Set([
        ...Object.keys(mexcBalances),
        ...Object.keys(dbBalances)
      ]);

      // Step 4: Check each symbol for discrepancies
      for (const symbol of allSymbols) {
        const mexcAmount = mexcBalances[symbol] || 0;
        const dbAmount = dbBalances[symbol] || 0;
        const difference = Math.abs(mexcAmount - dbAmount);
        const percentDiff = dbAmount > 0 ? (difference / dbAmount) * 100 : 100;

        if (difference > 0.0001) { // Ignore tiny floating point errors
          const discrepancy = {
            symbol,
            mexcAmount,
            dbAmount,
            difference,
            percentDiff,
            severity: percentDiff > this.criticalThreshold ? 'CRITICAL' : 'MINOR'
          };
          
          discrepancies.push(discrepancy);
          console.log(`⚠️  ${discrepancy.severity}: ${symbol}`);
          console.log(`   MEXC: ${mexcAmount} | DB: ${dbAmount} | Diff: ${difference}`);
        }
      }

      // Step 5: Auto-correct discrepancies
      if (discrepancies.length > 0) {
        await this.autoCorrectDiscrepancies(discrepancies);
      }

      // Step 6: Verify USDT balance
      await this.reconcileUSDTBalance();

      // Step 7: Export dashboard
      await this.exportDashboard();

      // Step 8: Log results
      await this.logReconciliation({
        tradeSymbol,
        discrepancies: discrepancies.length,
        duration: Date.now() - startTime,
        status: 'SUCCESS'
      });

      console.log(`✅ RECONCILIATION COMPLETE: ${discrepancies.length} discrepancies fixed`);
      return discrepancies;

    } catch (error) {
      console.error(`❌ RECONCILIATION FAILED: ${error.message}`);
      await this.logReconciliation({
        tradeSymbol,
        error: error.message,
        status: 'FAILED'
      });
      throw error;
    }
  }

  /**
   * Get all balances from MEXC API
   */
  async getMexcBalances() {
    try {
      const { stdout } = await execAsync(`
        ACCESS_KEY="mx0vglPqN8IwDPj4N0"
        SECRET_KEY="817579cb761b4793a2fd4bd6cdc7a7cf"
        TIMESTAMP=$(date +%s000)
        QUERY_STRING="timestamp=$TIMESTAMP"
        SIGNATURE=$(echo -n "$QUERY_STRING" | openssl dgst -sha256 -hmac "$SECRET_KEY" | cut -d' ' -f2)
        
        curl -s "https://api.mexc.com/api/v3/account?$QUERY_STRING&signature=$SIGNATURE" \\
          -H "X-MEXC-APIKEY: $ACCESS_KEY"
      `);

      const response = JSON.parse(stdout);
      const balances = {};
      
      if (response.balances) {
        response.balances.forEach(balance => {
          const amount = parseFloat(balance.free);
          if (amount > 0.0001) {
            balances[balance.asset] = amount;
          }
        });
      }

      return balances;
    } catch (error) {
      throw new Error(`Failed to get MEXC balances: ${error.message}`);
    }
  }

  /**
   * Get all balances from Portfolio DB
   */
  async getDbBalances() {
    try {
      const { stdout } = await execAsync(`
        sqlite3 shared/portfolio.db "SELECT symbol, amount FROM holdings WHERE status = 'active';"
      `);

      const balances = { USDT: 0 };
      
      // Parse holdings
      if (stdout.trim()) {
        stdout.trim().split('\n').forEach(line => {
          const [symbol, amount] = line.split('|');
          if (symbol && amount) {
            balances[symbol] = parseFloat(amount);
          }
        });
      }

      // Get USDT separately
      const { stdout: usdtResult } = await execAsync(`
        sqlite3 shared/portfolio.db "SELECT value FROM meta WHERE key = 'usdt_free';"
      `);
      if (usdtResult.trim()) {
        balances.USDT = parseFloat(usdtResult.trim());
      }

      return balances;
    } catch (error) {
      throw new Error(`Failed to get DB balances: ${error.message}`);
    }
  }

  /**
   * Automatically correct discrepancies
   */
  async autoCorrectDiscrepancies(discrepancies) {
    console.log(`🔧 AUTO-CORRECTING ${discrepancies.length} DISCREPANCIES`);

    for (const disc of discrepancies) {
      if (disc.symbol === 'USDT') {
        // Update USDT in meta table
        await execAsync(`
          sqlite3 shared/portfolio.db "
          UPDATE meta 
          SET value = '${disc.mexcAmount}', updated_at = datetime('now')
          WHERE key = 'usdt_free';
          "
        `);
      } else {
        // Update or insert holding
        await execAsync(`
          sqlite3 shared/portfolio.db "
          INSERT OR REPLACE INTO holdings (
            symbol, name, amount, entry_price, exchange, chain, 
            contract_address, coinpaprika_id, status, entry_date, 
            current_price, updated_at
          ) 
          SELECT 
            '${disc.symbol}', 
            COALESCE(name, '${disc.symbol}'), 
            ${disc.mexcAmount},
            COALESCE(entry_price, 0.001),
            COALESCE(exchange, 'MEXC'),
            COALESCE(chain, 'Unknown'),
            COALESCE(contract_address, 'TBD'),
            COALESCE(coinpaprika_id, 'tbd-${disc.symbol.toLowerCase()}'),
            'active',
            COALESCE(entry_date, '2026-02-19'),
            COALESCE(current_price, 0.001),
            datetime('now')
          FROM (
            SELECT * FROM holdings WHERE symbol = '${disc.symbol}'
            UNION SELECT NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL WHERE NOT EXISTS (
              SELECT 1 FROM holdings WHERE symbol = '${disc.symbol}'
            )
          ) LIMIT 1;
          "
        `);
      }

      console.log(`   ✅ Fixed ${disc.symbol}: ${disc.dbAmount} → ${disc.mexcAmount}`);
    }
  }

  /**
   * Reconcile USDT balance specifically
   */
  async reconcileUSDTBalance() {
    const mexcBalances = await this.getMexcBalances();
    const mexcUSDT = mexcBalances.USDT || 0;

    await execAsync(`
      sqlite3 shared/portfolio.db "
      UPDATE meta 
      SET value = '${mexcUSDT}', updated_at = datetime('now')
      WHERE key = 'usdt_free';
      "
    `);
  }

  /**
   * Export dashboard after reconciliation
   */
  async exportDashboard() {
    try {
      await execAsync('cd shared/crypto-dashboard && ./export-data.sh');
      console.log('✅ Dashboard exported');
    } catch (error) {
      console.error(`⚠️  Dashboard export failed: ${error.message}`);
    }
  }

  /**
   * Log reconciliation results
   */
  async logReconciliation(data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...data
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      await fs.appendFile(this.logFile, logLine);
    } catch (error) {
      console.error(`Failed to write log: ${error.message}`);
    }
  }

  /**
   * QUICK CHECK - for periodic health checks
   */
  async quickHealthCheck() {
    const discrepancies = await this.reconcileAfterTrade('HEALTH_CHECK');
    
    if (discrepancies.length > 0) {
      console.log(`⚠️  Found ${discrepancies.length} discrepancies in health check`);
      return false;
    }
    
    return true;
  }
}

export { PostTradeReconciliation };

/**
 * USAGE EXAMPLE:
 * 
 * // MANDATORY after every trade
 * const reconciler = new PostTradeReconciliation();
 * await reconciler.reconcileAfterTrade('STORJ', 6341.24);
 * 
 * // Periodic health check
 * await reconciler.quickHealthCheck();
 */

// CLI usage
if (process.argv[2]) {
  const reconciler = new PostTradeReconciliation();
  const symbol = process.argv[2];
  const amount = process.argv[3] ? parseFloat(process.argv[3]) : null;
  
  reconciler.reconcileAfterTrade(symbol, amount)
    .then(discrepancies => {
      console.log(`Reconciliation complete: ${discrepancies.length} issues fixed`);
      process.exit(0);
    })
    .catch(error => {
      console.error(`Reconciliation failed: ${error.message}`);
      process.exit(1);
    });
}