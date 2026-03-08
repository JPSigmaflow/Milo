#!/usr/bin/env node
/**
 * BULLETPROOF TRADE EXECUTION PIPELINE
 * Garantiert: DB Update SOFORT nach jedem Trade
 */

import fs from 'fs';
import { execSync } from 'child_process';

const DB_PATH = '/Users/milo/.openclaw/workspace/shared/portfolio.db';

class TradeExecutor {
    
    async executeTrade(tradeData) {
        const { coin, type, amount, price, total } = tradeData;
        
        console.log(`🚀 EXECUTING: ${type} ${amount} ${coin} @ $${price}`);
        
        try {
            // 1. PRE-TRADE VALIDATION
            await this.validatePreTrade(tradeData);
            
            // 2. EXECUTE TRADE ON MEXC
            const orderResult = await this.executeMEXCOrder(tradeData);
            
            // 3. IMMEDIATE DB UPDATE (CRITICAL!)
            await this.updateDatabaseImmediately(orderResult);
            
            // 4. POST-TRADE VALIDATION  
            await this.validatePostTrade(orderResult);
            
            // 5. DASHBOARD SYNC
            await this.syncDashboard();
            
            console.log(`✅ TRADE COMPLETED: ${orderResult.orderId}`);
            return orderResult;
            
        } catch (error) {
            console.error(`❌ TRADE FAILED: ${error.message}`);
            // ROLLBACK if needed
            await this.handleTradeFailure(error);
            throw error;
        }
    }
    
    async updateDatabaseImmediately(orderResult) {
        console.log(`📊 UPDATING DB IMMEDIATELY...`);
        
        const { coin, type, amount, price, total, orderId, timestamp } = orderResult;
        
        // CRITICAL: Use SQLite transactions for atomicity
        const sql = `
        BEGIN TRANSACTION;
        
        -- Insert transaction record
        INSERT INTO transactions (
            coin, type, amount, price_usd, total_usd, 
            tx_date, notes, created_at
        ) VALUES (
            '${coin}', '${type}', ${amount}, ${price}, ${total},
            '${timestamp}', 'Order ID: ${orderId}', datetime('now')
        );
        
        -- Update holdings table
        ${type === 'BUY' ? this.generateBuySQL(coin, amount, price) : this.generateSellSQL(coin, amount)}
        
        -- Update USDT balance
        UPDATE meta SET 
            value = value - ${type === 'BUY' ? total : -total},
            updated_at = datetime('now')
        WHERE key = 'usdt_free';
        
        COMMIT;
        `;
        
        // Execute with error handling
        execSync(`sqlite3 "${DB_PATH}" "${sql}"`, { stdio: 'pipe' });
        
        console.log(`✅ DB UPDATED: ${coin} ${type} recorded`);
    }
    
    generateBuySQL(coin, amount, price) {
        return `
        INSERT OR REPLACE INTO holdings (
            symbol, name, amount, entry_price, exchange, chain, 
            contract_address, coinpaprika_id, status, entry_date, updated_at
        ) VALUES (
            '${coin}', 
            (SELECT name FROM coin_mappings WHERE symbol = '${coin}'),
            COALESCE((SELECT amount FROM holdings WHERE symbol = '${coin}'), 0) + ${amount},
            ${price},
            'MEXC',
            (SELECT chain FROM coin_mappings WHERE symbol = '${coin}'),
            (SELECT contract FROM coin_mappings WHERE symbol = '${coin}'),
            (SELECT coinpaprika_id FROM coin_mappings WHERE symbol = '${coin}'),
            'active',
            date('now'),
            datetime('now')
        );`;
    }
    
    generateSellSQL(coin, amount) {
        return `
        UPDATE holdings SET 
            amount = amount - ${amount},
            status = CASE WHEN (amount - ${amount}) <= 0 THEN 'sold' ELSE 'active' END,
            sold_date = CASE WHEN (amount - ${amount}) <= 0 THEN date('now') ELSE sold_date END,
            updated_at = datetime('now')
        WHERE symbol = '${coin}';`;
    }
    
    async validatePostTrade(orderResult) {
        console.log(`🔍 POST-TRADE VALIDATION...`);
        
        // Check if DB was actually updated
        const result = execSync(`sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM transactions WHERE notes LIKE '%${orderResult.orderId}%'"`, { encoding: 'utf8' });
        
        if (parseInt(result.trim()) === 0) {
            throw new Error(`CRITICAL: Transaction ${orderResult.orderId} NOT found in DB!`);
        }
        
        console.log(`✅ POST-VALIDATION PASSED: Order ${orderResult.orderId} in DB`);
    }
    
    async syncDashboard() {
        console.log(`📊 SYNCING DASHBOARD...`);
        
        try {
            execSync('cd /Users/milo/.openclaw/workspace/shared/crypto-dashboard && ./export-data.sh', { stdio: 'pipe' });
            execSync('cd /Users/milo/.openclaw/workspace/shared/crypto-dashboard && ./validate-deployment.sh', { stdio: 'pipe' });
            console.log(`✅ DASHBOARD SYNCED & VALIDATED`);
        } catch (error) {
            console.error(`⚠️  DASHBOARD SYNC FAILED: ${error.message}`);
            // Don't fail the trade, but alert
        }
    }
}

export default TradeExecutor;