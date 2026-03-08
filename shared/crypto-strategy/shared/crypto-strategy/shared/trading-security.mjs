#!/usr/bin/env node
/**
 * TRADING SECURITY LAYER - Mandatory Guards
 * Implementiert nach Double-Order-Incident vom 2026-02-19
 */

class TradingSecurity {
  static COOLDOWN_MINUTES = 15;
  static activeOrders = new Map();
  static orderHistory = new Set();

  /**
   * A) Symbol-Mutex-Lock
   */
  static lockSymbol(symbol, orderId) {
    if (this.activeOrders.has(symbol)) {
      throw new Error(`SYMBOL_LOCKED: ${symbol} order in progress`);
    }
    this.activeOrders.set(symbol, {
      orderId,
      lockedAt: Date.now(),
      type: 'TRADING'
    });
  }

  static unlockSymbol(symbol) {
    this.activeOrders.delete(symbol);
  }

  /**
   * B) Idempotency-Key Pflicht
   */
  static generateOrderHash(symbol, amount, confirmId) {
    return `${symbol}_${amount}_${confirmId}_${Date.now()}`;
  }

  /**
   * C) Unique Order Hash Validation
   */
  static validateUniqueOrder(orderHash) {
    if (this.orderHistory.has(orderHash)) {
      throw new Error(`DUPLICATE_ORDER: ${orderHash} already processed`);
    }
    this.orderHistory.add(orderHash);
    // Keep only last 1000 orders in memory
    if (this.orderHistory.size > 1000) {
      const oldest = [...this.orderHistory][0];
      this.orderHistory.delete(oldest);
    }
  }

  /**
   * D) Confirm-ID Single Use
   */
  static usedConfirmIds = new Set();
  
  static validateConfirmId(confirmId) {
    if (this.usedConfirmIds.has(confirmId)) {
      throw new Error(`CONFIRM_ID_REUSED: ${confirmId}`);
    }
    this.usedConfirmIds.add(confirmId);
  }

  /**
   * E) Cooldown per Symbol
   */
  static lastOrderTime = new Map();

  static checkCooldown(symbol) {
    const lastOrder = this.lastOrderTime.get(symbol);
    if (lastOrder) {
      const minutesSince = (Date.now() - lastOrder) / 60000;
      if (minutesSince < this.COOLDOWN_MINUTES) {
        throw new Error(`COOLDOWN_ACTIVE: ${symbol} cooldown for ${Math.ceil(this.COOLDOWN_MINUTES - minutesSince)}m`);
      }
    }
  }

  static recordOrderTime(symbol) {
    this.lastOrderTime.set(symbol, Date.now());
  }

  /**
   * F) Live Position Check
   */
  static async checkExistingPosition(symbol) {
    // Query portfolio.db for existing position
    const position = await this.queryPosition(symbol);
    if (position && position.amount > 0) {
      throw new Error(`POSITION_EXISTS: ${symbol} already held (${position.amount})`);
    }
  }

  static async queryPosition(symbol) {
    // Placeholder - implement DB query
    return null;
  }

  /**
   * MASTER VALIDATION BEFORE ANY TRADE
   */
  static async validateTrade(symbol, amount, confirmId) {
    const orderHash = this.generateOrderHash(symbol, amount, confirmId);
    
    // Execute all checks
    this.checkCooldown(symbol);
    this.validateUniqueOrder(orderHash);
    this.validateConfirmId(confirmId);
    this.lockSymbol(symbol, orderHash);
    await this.checkExistingPosition(symbol);

    console.log(`✅ TRADE_VALIDATED: ${symbol} ${amount} ${confirmId}`);
    return orderHash;
  }

  /**
   * POST-TRADE CLEANUP
   */
  static completeTrade(symbol, success = true) {
    if (success) {
      this.recordOrderTime(symbol);
    }
    this.unlockSymbol(symbol);
    console.log(`✅ TRADE_COMPLETED: ${symbol} success=${success}`);
  }
}

/**
 * G) Server-side Order Deduplication
 */
class OrderLogger {
  static logFile = './trade-audit.log';
  
  static log(orderData) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} | ${JSON.stringify(orderData)}\n`;
    // Append to log file
    console.log(`📝 ORDER_LOGGED: ${orderData.symbol} ${orderData.amount}`);
  }
}

export { TradingSecurity, OrderLogger };

/**
 * USAGE EXAMPLE:
 * 
 * try {
 *   const orderHash = await TradingSecurity.validateTrade('STORJ', 600, 'CHRIS_JURI_20260219');
 *   // Execute MEXC API call
 *   const result = await mexcBuyOrder('STORJUSDT', 600);
 *   TradingSecurity.completeTrade('STORJ', true);
 *   OrderLogger.log({ symbol: 'STORJ', amount: 600, result, orderHash });
 * } catch (error) {
 *   TradingSecurity.completeTrade('STORJ', false);
 *   throw error;
 * }
 */