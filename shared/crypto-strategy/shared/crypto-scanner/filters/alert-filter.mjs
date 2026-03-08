#!/usr/bin/env node
/**
 * ALERT FILTER - Verschärfte Kriterien (2026-03-07)
 * 
 * Filtert scanner.db coins nach neuen Alert-Regeln:
 * - Deep-Dive: Score >= 85 (nicht 70)
 * - Watchlist: KEINE Alerts
 * - Max 5 Alerts pro Tag
 * - Duplikat-Check (24h)
 * 
 * Usage: node alert-filter.mjs [--dry-run]
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-strategy/scanner.db';

// Config
const MAX_ALERTS_PER_DAY = 5;
const MIN_SCORE_DEEP_DIVE = 85;
const MIN_SCORE_SETUP = 92;
const DUPLICATE_WINDOW_HOURS = 24;

async function openDb() {
  return await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

function isWithin24h(timestamp) {
  if (!timestamp) return false;
  const alertTime = new Date(timestamp);
  const now = new Date();
  const diffHours = (now - alertTime) / (1000 * 60 * 60);
  return diffHours < DUPLICATE_WINDOW_HOURS;
}

async function getAlertsToday(db) {
  const today = new Date().toISOString().split('T')[0];
  const result = await db.get(
    `SELECT COUNT(*) as count FROM coins 
     WHERE date(alert_sent_at) = ?`,
    [today]
  );
  return result.count;
}

async function getAlertableCandidates(db) {
  // Get coins that meet basic criteria
  const candidates = await db.all(`
    SELECT 
      id, symbol, name, score, result, 
      market_cap, narrative, source,
      alert_sent_at, alert_price, last_alert_score,
      scanned_at
    FROM coins
    WHERE 
      scanned_at >= datetime('now', '-7 days')
      AND result IN ('deep-dive', 'setup', 'bought')
    ORDER BY score DESC, scanned_at DESC
  `);
  
  const filtered = [];
  
  for (const coin of candidates) {
    // Rule 1: Score threshold
    if (coin.result === 'deep-dive' && coin.score < MIN_SCORE_DEEP_DIVE) {
      console.log(`  ❌ ${coin.symbol}: Score ${coin.score} < ${MIN_SCORE_DEEP_DIVE} (deep-dive)`);
      continue;
    }
    
    if (coin.result === 'setup' && coin.score < MIN_SCORE_SETUP) {
      console.log(`  ❌ ${coin.symbol}: Score ${coin.score} < ${MIN_SCORE_SETUP} (setup)`);
      continue;
    }
    
    // Rule 2: Duplicate check (24h)
    if (isWithin24h(coin.alert_sent_at)) {
      console.log(`  ❌ ${coin.symbol}: Already alerted within 24h`);
      continue;
    }
    
    // Rule 3: Status change only (if already alerted)
    if (coin.alert_sent_at && coin.last_alert_score >= coin.score) {
      console.log(`  ❌ ${coin.symbol}: No score improvement (was ${coin.last_alert_score}, now ${coin.score})`);
      continue;
    }
    
    filtered.push(coin);
  }
  
  return filtered;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  
  console.log('🔍 Alert Filter - Neue Kriterien (2026-03-07)\n');
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`Max Alerts/Tag: ${MAX_ALERTS_PER_DAY}`);
  console.log(`Min Score Deep-Dive: ${MIN_SCORE_DEEP_DIVE}`);
  console.log(`Min Score Setup: ${MIN_SCORE_SETUP}\n`);
  
  const db = await openDb();
  
  // Check daily limit
  const todayCount = await getAlertsToday(db);
  console.log(`Alerts heute: ${todayCount}/${MAX_ALERTS_PER_DAY}\n`);
  
  if (todayCount >= MAX_ALERTS_PER_DAY) {
    console.log('❌ Daily limit reached. Keine weiteren Alerts heute.\n');
    await db.close();
    return;
  }
  
  // Get candidates
  const candidates = await getAlertableCandidates(db);
  
  if (candidates.length === 0) {
    console.log('✅ Keine neuen Alerts nötig.\n');
    await db.close();
    return;
  }
  
  console.log(`\n📊 ${candidates.length} Kandidaten gefunden:\n`);
  
  // Take top N within daily limit
  const remaining = MAX_ALERTS_PER_DAY - todayCount;
  const toAlert = candidates.slice(0, remaining);
  
  for (const coin of toAlert) {
    const mc = coin.market_cap ? `$${(coin.market_cap / 1e6).toFixed(1)}M` : 'N/A';
    console.log(`✅ ${coin.symbol} (${coin.name})`);
    console.log(`   Score: ${coin.score} | ${coin.result} | MC: ${mc}`);
    console.log(`   Narrative: ${coin.narrative || 'N/A'}`);
    console.log(`   Source: ${coin.source || 'N/A'}\n`);
    
    if (!dryRun) {
      // Mark as alerted
      await db.run(`
        UPDATE coins 
        SET 
          alert_sent_at = datetime('now'),
          last_alert_score = ?
        WHERE id = ?
      `, [coin.score, coin.id]);
    }
  }
  
  if (toAlert.length < candidates.length) {
    const suppressed = candidates.length - toAlert.length;
    console.log(`⚠️  ${suppressed} Coins suppressed (daily limit)\n`);
  }
  
  if (dryRun) {
    console.log('🧪 DRY-RUN: Keine DB-Updates\n');
  } else {
    console.log('✅ DB updated\n');
  }
  
  await db.close();
  
  // Return coins to alert (for OpenClaw integration)
  return toAlert;
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const coins = await main();
  
  if (coins && coins.length > 0) {
    console.log(`📤 Ready to alert: ${coins.map(c => c.symbol).join(', ')}\n`);
  }
}

export { main as filterAlerts };
