#!/usr/bin/env node
/**
 * Pump.fun Price Tracker — Core DB Module
 * 
 * Creates and manages the pumpfun-tracker.db SQLite database.
 * Only tracks Pump.fun coins (addresses ending in 'pump' or from pumpfun-candidates.json).
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'pumpfun-tracker.db');
const CANDIDATES_PATH = join(__dirname, '..', 'crypto-scanner', 'data', 'pumpfun-candidates.json');

export function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS watchlist_coins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain TEXT NOT NULL DEFAULT 'solana',
      token_address TEXT NOT NULL,
      token_name TEXT,
      symbol TEXT,
      added_at DATETIME NOT NULL,
      added_by TEXT DEFAULT 'scanner',
      score INTEGER,
      criteria_json TEXT,
      dexscreener_url TEXT,
      mc_at_add REAL,
      entry_price_usd REAL,
      last_snapshot_at DATETIME,
      snapshot_interval_h INTEGER DEFAULT 6,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','stale','inactive')),
      stale_count INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(chain, token_address)
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coin_id INTEGER NOT NULL REFERENCES watchlist_coins(id),
      ts DATETIME NOT NULL,
      ts_bucket INTEGER NOT NULL,
      price_usd REAL,
      market_cap REAL,
      fdv REAL,
      liquidity_usd REAL,
      volume_24h REAL,
      txns_24h_buys INTEGER,
      txns_24h_sells INTEGER,
      source TEXT DEFAULT 'dexscreener',
      raw_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(coin_id, ts_bucket)
    );

    CREATE TABLE IF NOT EXISTS exchange_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coin_id INTEGER NOT NULL REFERENCES watchlist_coins(id),
      exchange TEXT NOT NULL,
      market_symbol TEXT,
      listed_at DATETIME,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      match_type TEXT CHECK(match_type IN ('contract','symbol','manual')),
      confidence REAL,
      UNIQUE(coin_id, exchange)
    );

    CREATE TABLE IF NOT EXISTS tracker_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts DATETIME DEFAULT CURRENT_TIMESTAMP,
      action TEXT,
      detail TEXT,
      coins_processed INTEGER,
      errors_count INTEGER,
      duration_ms INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_snap_coin_ts ON snapshots(coin_id, ts_bucket);
    CREATE INDEX IF NOT EXISTS idx_snap_ts ON snapshots(ts);
    CREATE INDEX IF NOT EXISTS idx_coins_status ON watchlist_coins(status);
    CREATE INDEX IF NOT EXISTS idx_coins_chain_addr ON watchlist_coins(chain, token_address);
  `);
}

/**
 * Import coins from pumpfun-candidates.json (score >= 8)
 */
export function importFromCandidates(db, minScore = 8) {
  if (!fs.existsSync(CANDIDATES_PATH)) {
    console.error(`Candidates file not found: ${CANDIDATES_PATH}`);
    return { imported: 0, skipped: 0 };
  }

  const candidates = JSON.parse(fs.readFileSync(CANDIDATES_PATH, 'utf8'));
  const qualified = candidates.filter(c => (c.score || 0) >= minScore && c.address);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO watchlist_coins 
    (chain, token_address, token_name, symbol, added_at, score, criteria_json, mc_at_add, status)
    VALUES (@chain, @address, @name, @symbol, @added_at, @score, @criteria, @mc, 'active')
  `);

  let imported = 0, skipped = 0;

  const tx = db.transaction(() => {
    for (const c of qualified) {
      // GOVERNANCE: Enforce score <= 12
      if (c.score > 12) {
        console.error(`⚠️ GOVERNANCE VIOLATION: ${c.symbol} has score ${c.score} > 12 - REJECTED`);
        skipped++;
        continue;
      }
      
      const result = insert.run({
        chain: 'solana',
        address: c.address,
        name: c.name || 'Unknown',
        symbol: c.symbol || c.name || '?',
        added_at: c.scannedAt || new Date().toISOString(),
        score: c.score,
        criteria: c.criteria ? JSON.stringify(c.criteria) : null,
        mc: c.marketCap || null
      });
      if (result.changes > 0) imported++;
      else skipped++;
    }
  });
  tx();

  return { imported, skipped, total: qualified.length };
}

/**
 * Get all active coins
 */
export function getActiveCoins(db) {
  return db.prepare(`SELECT * FROM watchlist_coins WHERE status = 'active'`).all();
}

/**
 * Compute ts_bucket for a given interval (in hours)
 */
export function tsBucket(timestampMs, intervalH = 6) {
  const intervalMs = intervalH * 3600 * 1000;
  return Math.floor(timestampMs / intervalMs) * intervalMs;
}

/**
 * Insert snapshot (idempotent via UNIQUE constraint)
 */
export function insertSnapshot(db, coinId, data, intervalH = 6) {
  const now = Date.now();
  const bucket = tsBucket(now, intervalH);

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO snapshots 
    (coin_id, ts, ts_bucket, price_usd, market_cap, fdv, liquidity_usd, volume_24h, 
     txns_24h_buys, txns_24h_sells, source, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dexscreener', ?)
  `);

  return stmt.run(
    coinId,
    new Date(now).toISOString(),
    bucket,
    data.priceUsd || null,
    data.marketCap || null,
    data.fdv || null,
    data.liquidity || null,
    data.volume24h || null,
    data.txnsBuys || null,
    data.txnsSells || null,
    JSON.stringify(data.raw || {})
  );
}

/**
 * Update entry price if not set
 */
export function setEntryPriceIfEmpty(db, coinId, priceUsd) {
  db.prepare(`
    UPDATE watchlist_coins SET entry_price_usd = ? 
    WHERE id = ? AND entry_price_usd IS NULL
  `).run(priceUsd, coinId);
}

/**
 * Update last_snapshot_at and reset stale count
 */
export function markSnapshotSuccess(db, coinId) {
  db.prepare(`
    UPDATE watchlist_coins 
    SET last_snapshot_at = datetime('now'), stale_count = 0 
    WHERE id = ?
  `).run(coinId);
}

/**
 * Increment stale count and update status if needed
 */
export function markStale(db, coinId) {
  db.prepare(`
    UPDATE watchlist_coins 
    SET stale_count = stale_count + 1,
        status = CASE 
          WHEN stale_count + 1 >= 28 THEN 'inactive'
          WHEN stale_count + 1 >= 3 THEN 'stale'
          ELSE status
        END
    WHERE id = ?
  `).run(coinId);
}

/**
 * Log tracker action
 */
export function logAction(db, action, detail, coinsProcessed, errorsCount, durationMs) {
  db.prepare(`
    INSERT INTO tracker_log (action, detail, coins_processed, errors_count, duration_ms)
    VALUES (?, ?, ?, ?, ?)
  `).run(action, detail, coinsProcessed, errorsCount, durationMs);
}

// CLI: node tracker-core.mjs [init|import|status]
if (process.argv[1] && process.argv[1].includes('tracker-core')) {
  const cmd = process.argv[2] || 'init';
  const db = getDb();
  
  if (cmd === 'init') {
    initSchema(db);
    console.log('✅ Schema initialized');
  }
  
  if (cmd === 'import' || cmd === 'init') {
    initSchema(db);
    const result = importFromCandidates(db);
    console.log(`📥 Import: ${result.imported} new, ${result.skipped} already existed (${result.total} qualified)`);
  }
  
  if (cmd === 'status') {
    initSchema(db);
    const coins = db.prepare(`SELECT status, COUNT(*) as cnt FROM watchlist_coins GROUP BY status`).all();
    const snaps = db.prepare(`SELECT COUNT(*) as cnt FROM snapshots`).all();
    const lastSnap = db.prepare(`SELECT MAX(ts) as last_ts FROM snapshots`).get();
    console.log('📊 Status:');
    coins.forEach(r => console.log(`  ${r.status}: ${r.cnt} coins`));
    console.log(`  Snapshots: ${snaps[0].cnt}`);
    console.log(`  Last snapshot: ${lastSnap.last_ts || 'none'}`);
  }
  
  db.close();
}
