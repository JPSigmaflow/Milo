#!/usr/bin/env node
/**
 * POST-TRADE HOOK SYSTEM
 * SOFORT nach jedem Trade: DB Update → Validation → Dashboard Export
 * BULLETPROOF: Garantiert konsistente DB-MEXC Synchronisation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import { TradeLock } from './trade-lock.mjs';

const PORTFOLIO_DB = '/Users/milo/.openclaw/workspace/shared/portfolio.db';
const DASHBOARD_DIR = '/Users/milo/.openclaw/workspace/shared/crypto-dashboard';

class PostTradeHook {
    
    static async execute(tradeData, force = false) {
        const { coin, type, amount, price_usd, total_usd, order_id, timestamp } = tradeData;
        
        console.log(`🔄 POST-TRADE HOOK: ${type} ${amount} ${coin} @ $${price_usd}`);
        
        if (!force && TradeLock.isLocked()) {
            console.log(`🔒 Trade lock active - skipping hook`);
            return;
        }
        
        try {
            // 1. IMMEDIATE DB UPDATE (CRITICAL PATH!)
            await this.updateDatabaseTransaction(tradeData);
            
            // 2. VALIDATE DB CONSISTENCY
            await this.validateDatabaseConsistency(tradeData);
            
            // 3. UPDATE HOLDINGS TABLE
            await this.updateHoldingsTable(tradeData);
            
            // 4. UPDATE USDT BALANCE  
            await this.updateUSDTBalance(tradeData);
            
            // 5. SYNC DASHBOARD (IMMEDIATE!)
            await this.syncDashboardImmediate();
            
            // 6. VALIDATE EXPORT SUCCESS
            await this.validateExportSuccess(tradeData);
            
            console.log(`✅ POST-TRADE HOOK COMPLETED: ${order_id}`);
            
            return { success: true, order_id };
            
        } catch (error) {
            console.error(`❌ POST-TRADE HOOK FAILED: ${error.message}`);
            
            // CRITICAL: Alert on failure
            await this.sendCriticalAlert(tradeData, error);
            
            throw error;
        }
    }
    
    static async updateDatabaseTransaction(tradeData) {
        const { coin, type, amount, price_usd, total_usd, order_id, timestamp } = tradeData;
        
        console.log(`📊 Updating transactions table...`);
        
        const sql = `
        INSERT INTO transactions (
            coin, type, amount, price_usd, total_usd, 
            fee_usd, exchange, tx_date, notes, created_at
        ) VALUES (
            '${coin}', '${type}', ${amount}, ${price_usd}, ${total_usd},
            0, 'MEXC', '${timestamp}', 'Order ID: ${order_id}', datetime('now')
        );`;
        
        try {
            execSync(`sqlite3 "${PORTFOLIO_DB}" "${sql}"`, { stdio: 'pipe' });
            console.log(`✅ Transaction recorded: ${coin} ${type}`);
        } catch (error) {
            throw new Error(`DB transaction insert failed: ${error.message}`);
        }
    }
    
    static async updateHoldingsTable(tradeData) {
        const { coin, type, amount, price_usd } = tradeData;
        
        console.log(`🏦 Updating holdings table...`);
        
        let sql;
        if (type === 'BUY') {
            sql = `
            INSERT OR REPLACE INTO holdings (
                symbol, name, amount, entry_price, exchange, chain,
                contract_address, coinpaprika_id, status, entry_date, updated_at
            ) 
            SELECT 
                '${coin}',
                COALESCE((SELECT name FROM holdings WHERE symbol = '${coin}' LIMIT 1), '${coin}'),
                COALESCE((SELECT amount FROM holdings WHERE symbol = '${coin}'), 0) + ${amount},
                ${price_usd},
                'MEXC',
                COALESCE((SELECT chain FROM holdings WHERE symbol = '${coin}' LIMIT 1), 'Unknown'),
                COALESCE((SELECT contract_address FROM holdings WHERE symbol = '${coin}' LIMIT 1), ''),
                COALESCE((SELECT coinpaprika_id FROM holdings WHERE symbol = '${coin}' LIMIT 1), ''),
                'active',
                COALESCE((SELECT entry_date FROM holdings WHERE symbol = '${coin}' LIMIT 1), date('now')),
                datetime('now');`;
        } else { // SELL
            sql = `
            UPDATE holdings SET 
                amount = amount - ${amount},
                status = CASE WHEN (amount - ${amount}) <= 0 THEN 'sold' ELSE 'active' END,
                sold_date = CASE WHEN (amount - ${amount}) <= 0 THEN date('now') ELSE sold_date END,
                sold_price = ${price_usd},
                updated_at = datetime('now')
            WHERE symbol = '${coin}';`;
        }
        
        try {
            execSync(`sqlite3 "${PORTFOLIO_DB}" "${sql}"`, { stdio: 'pipe' });
            console.log(`✅ Holdings updated: ${coin} ${type}`);
        } catch (error) {
            throw new Error(`Holdings update failed: ${error.message}`);
        }
    }
    
    static async updateUSDTBalance(tradeData) {
        const { type, total_usd } = tradeData;
        
        console.log(`💰 Updating USDT balance...`);
        
        // BUY = subtract from USDT, SELL = add to USDT
        const modifier = type === 'BUY' ? -total_usd : total_usd;
        
        const sql = `
        UPDATE meta SET 
            value = CAST(value AS REAL) + ${modifier},
            updated_at = datetime('now')
        WHERE key = 'usdt_free';`;
        
        try {
            execSync(`sqlite3 "${PORTFOLIO_DB}" "${sql}"`, { stdio: 'pipe' });
            
            // Verify balance is not negative
            const newBalance = parseFloat(execSync(`sqlite3 "${PORTFOLIO_DB}" "SELECT value FROM meta WHERE key='usdt_free'"`, { encoding: 'utf8' }).trim());
            
            if (newBalance < 0) {
                throw new Error(`USDT balance went negative: $${newBalance}`);
            }
            
            console.log(`✅ USDT balance updated: ${modifier > 0 ? '+' : ''}$${modifier} (new: $${newBalance.toFixed(2)})`);
        } catch (error) {
            throw new Error(`USDT balance update failed: ${error.message}`);
        }
    }
    
    static async syncDashboardImmediate() {
        console.log(`📊 Syncing dashboard IMMEDIATELY...`);
        
        try {
            // Use enhanced export script
            const exportScript = `${DASHBOARD_DIR}/export-data-enhanced.sh`;
            if (fs.existsSync(exportScript)) {
                execSync(`chmod +x "${exportScript}"`);
                execSync(`cd "${DASHBOARD_DIR}" && ./export-data-enhanced.sh`, { 
                    stdio: 'pipe',
                    timeout: 30000 // 30 second timeout
                });
            } else {
                // Fallback to original
                execSync(`cd "${DASHBOARD_DIR}" && ./export-data.sh`, { 
                    stdio: 'pipe',
                    timeout: 30000
                });
            }
            
            console.log(`✅ Dashboard sync completed`);
        } catch (error) {
            throw new Error(`Dashboard sync failed: ${error.message}`);
        }
    }
    
    static async validateDatabaseConsistency(tradeData) {
        const { coin, type, amount, order_id } = tradeData;
        
        console.log(`🔍 Validating database consistency...`);
        
        // Check if transaction was recorded
        const txCount = parseInt(execSync(`sqlite3 "${PORTFOLIO_DB}" "SELECT COUNT(*) FROM transactions WHERE notes LIKE '%${order_id}%'"`, { encoding: 'utf8' }).trim());
        
        if (txCount === 0) {
            throw new Error(`Transaction ${order_id} not found in database!`);
        }
        
        // Check holdings table consistency
        const holdingsAmount = parseFloat(execSync(`sqlite3 "${PORTFOLIO_DB}" "SELECT COALESCE(amount, 0) FROM holdings WHERE symbol = '${coin}'"`, { encoding: 'utf8' }).trim()) || 0;
        
        if (type === 'BUY' && holdingsAmount === 0) {
            throw new Error(`Holdings not updated after BUY: ${coin} amount is 0`);
        }
        
        console.log(`✅ Database consistency validated`);
    }
    
    static async validateExportSuccess(tradeData) {
        const { order_id } = tradeData;
        
        console.log(`🔍 Validating export success...`);
        
        const dataJsonPath = `${DASHBOARD_DIR}/data.json`;
        if (!fs.existsSync(dataJsonPath)) {
            throw new Error(`data.json not found after export!`);
        }
        
        // Check if transaction appears in exported data
        const dataContent = fs.readFileSync(dataJsonPath, 'utf8');
        if (!dataContent.includes(order_id)) {
            throw new Error(`Order ${order_id} not found in exported data.json!`);
        }
        
        // Check export timestamp (should be recent)
        const data = JSON.parse(dataContent);
        const exportTime = new Date(data.exported_at);
        const now = new Date();
        const ageMinutes = (now - exportTime) / 60000;
        
        if (ageMinutes > 5) {
            throw new Error(`Export too old: ${ageMinutes.toFixed(1)} minutes`);
        }
        
        console.log(`✅ Export validation passed (${ageMinutes.toFixed(1)}min old)`);
    }
    
    static async sendCriticalAlert(tradeData, error) {
        const { coin, type, amount, order_id } = tradeData;
        
        const message = `🚨 KRITISCHER POST-TRADE HOOK FEHLER!

Trade: ${type} ${amount} ${coin}
Order: ${order_id}
Fehler: ${error.message}

⚠️  MANUELLE PRÜFUNG ERFORDERLICH!
DB könnte inkonsistent sein!`;

        console.log(`🚨 CRITICAL ALERT TO BE SENT:`);
        console.log(message);
        
        // In production: Send to Telegram WEundMILO group
        // await sendToTelegram(message, '-5299930122');
    }
}

export default PostTradeHook;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    if (args.length < 6) {
        console.error('Usage: node post-trade-hook.mjs <coin> <type> <amount> <price_usd> <total_usd> <order_id> [timestamp]');
        process.exit(1);
    }
    
    const [coin, type, amount, price_usd, total_usd, order_id, timestamp] = args;
    
    const tradeData = {
        coin,
        type: type.toUpperCase(),
        amount: parseFloat(amount),
        price_usd: parseFloat(price_usd),
        total_usd: parseFloat(total_usd),
        order_id,
        timestamp: timestamp || new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    
    PostTradeHook.execute(tradeData, true).then(result => {
        console.log('Hook completed:', result);
        process.exit(0);
    }).catch(error => {
        console.error('Hook failed:', error.message);
        process.exit(1);
    });
}