#!/usr/bin/env node
/**
 * TRADE LOCK SYSTEM
 * Verhindert Guardian interference während aktiven Trades
 */

import fs from 'fs';
import path from 'path';

const LOCK_FILE = '/tmp/milo-trade.lock';
const MAX_LOCK_AGE = 300; // 5 Minuten max

export class TradeLock {
    
    static async acquireLock(operation = 'TRADE') {
        // Check existing lock
        if (fs.existsSync(LOCK_FILE)) {
            const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
            const age = Date.now() - lockData.timestamp;
            
            if (age < MAX_LOCK_AGE * 1000) {
                throw new Error(`TRADE LOCKED: ${lockData.operation} in progress (${Math.round(age/1000)}s ago)`);
            } else {
                console.log(`⚠️  Stale lock detected (${Math.round(age/1000)}s) - removing`);
                fs.unlinkSync(LOCK_FILE);
            }
        }
        
        // Create new lock
        const lockData = {
            operation,
            timestamp: Date.now(),
            pid: process.pid,
            node: process.env.NODE_ENV || 'development'
        };
        
        fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
        console.log(`🔒 TRADE LOCK ACQUIRED: ${operation}`);
        
        return lockData;
    }
    
    static releaseLock() {
        if (fs.existsSync(LOCK_FILE)) {
            fs.unlinkSync(LOCK_FILE);
            console.log(`🔓 TRADE LOCK RELEASED`);
        }
    }
    
    static isLocked() {
        if (!fs.existsSync(LOCK_FILE)) return false;
        
        const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
        const age = Date.now() - lockData.timestamp;
        
        return age < MAX_LOCK_AGE * 1000;
    }
    
    static getLockInfo() {
        if (!fs.existsSync(LOCK_FILE)) return null;
        
        const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
        const age = Date.now() - lockData.timestamp;
        
        return {
            ...lockData,
            ageSeconds: Math.round(age / 1000)
        };
    }
}

// Auto cleanup on process exit
process.on('exit', () => TradeLock.releaseLock());
process.on('SIGINT', () => {
    TradeLock.releaseLock();
    process.exit(0);
});
process.on('SIGTERM', () => {
    TradeLock.releaseLock();
    process.exit(0);
});