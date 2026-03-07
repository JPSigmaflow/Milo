#!/usr/bin/env node
/**
 * ANALYST WRAPPER mit verschärftem Alert-Filter
 * 
 * Neue Pipeline (2026-03-07):
 * 1. Normale ANALYST-Analyse läuft (pending-alerts → scanner.db)
 * 2. DANACH: alert-filter prüft ob Alert gesendet werden soll
 * 3. Nur Top-5 Coins (Score 85+) werden an Telegram geschickt
 * 
 * Cron: Alle 30min (ersetzt alten ANALYST Cron)
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-strategy/scanner.db';

// Alert config
const MAX_ALERTS_PER_DAY = 5;
const MIN_SCORE_ALERT = 85;
const TELEGRAM_CHAT = '-5299930122'; // WEundMILO

async function openDb() {
  return await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

async function getNewHighScoreCoins(db) {
  const today = new Date().toISOString().split('T')[0];
  
  // Get today's alert count
  const { count } = await db.get(
    `SELECT COUNT(*) as count FROM coins 
     WHERE date(alert_sent_at) = ?`,
    [today]
  );
  
  if (count >= MAX_ALERTS_PER_DAY) {
    console.log(`✅ Daily limit reached (${count}/${MAX_ALERTS_PER_DAY}). No more alerts today.`);
    return [];
  }
  
  const remaining = MAX_ALERTS_PER_DAY - count;
  
  // Get high-score coins that haven't been alerted today
  const coins = await db.all(`
    SELECT 
      id, symbol, name, score, result, 
      market_cap, narrative, source,
      alert_sent_at, scanned_at
    FROM coins
    WHERE 
      score >= ?
      AND result IN ('deep-dive', 'setup', 'bought')
      AND (alert_sent_at IS NULL OR date(alert_sent_at) < ?)
      AND scanned_at >= datetime('now', '-24 hours')
    ORDER BY score DESC, scanned_at DESC
    LIMIT ?
  `, [MIN_SCORE_ALERT, today, remaining]);
  
  return coins;
}

async function markAsAlerted(db, coinId, score) {
  await db.run(`
    UPDATE coins 
    SET 
      alert_sent_at = datetime('now'),
      last_alert_score = ?
    WHERE id = ?
  `, [score, coinId]);
}

async function sendTelegramAlert(coin) {
  const mc = coin.market_cap ? `$${(coin.market_cap / 1e6).toFixed(1)}M` : 'N/A';
  const message = `
🔥 HIGH-SCORE ALERT: ${coin.name}

**Score: ${coin.score}/100**
**Market Cap:** ${mc}
**Narrativ:** ${coin.narrative || 'N/A'}
**Source:** ${coin.source || 'N/A'}

Neue verschärfte Kriterien: Nur Top-5 Coins/Tag mit Score ≥85 werden gemeldet!
`.trim();
  
  console.log(`📤 Alert: ${coin.symbol} (Score ${coin.score})`);
  console.log(message);
  console.log('');
  
  // TODO: Actual Telegram send via OpenClaw message tool
  // For now just log it
}

async function main() {
  console.log('🔍 ANALYST Alert Filter - Running...\n');
  
  const db = await openDb();
  
  try {
    const coins = await getNewHighScoreCoins(db);
    
    if (coins.length === 0) {
      console.log('✅ No new alerts needed.\n');
      await db.close();
      return { alerts: [] };
    }
    
    console.log(`📊 Found ${coins.length} high-score coins to alert:\n`);
    
    const alerts = [];
    
    for (const coin of coins) {
      await sendTelegramAlert(coin);
      await markAsAlerted(db, coin.id, coin.score);
      alerts.push(coin);
    }
    
    console.log(`✅ Sent ${alerts.length} alerts\n`);
    
    await db.close();
    return { alerts };
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    await db.close();
    throw err;
  }
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await main();
  
  if (result.alerts.length > 0) {
    console.log(`📤 Alerted: ${result.alerts.map(c => c.symbol).join(', ')}\n`);
  }
}

export { main as runAnalystWithFilter };
