#!/usr/bin/env node
/**
 * Store Daily Report to DB
 * Run before sending to ensure we have historical data
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'pumpfun-tracker.db');

export function storeDailyReport() {
  const db = new Database(DB_PATH);
  const reportDate = new Date().toISOString().split('T')[0];
  
  // Basic stats
  const stats = {
    activeCoins: db.prepare("SELECT COUNT(*) as c FROM watchlist_coins WHERE status = 'active'").get().c,
    newToday: db.prepare("SELECT COUNT(*) as c FROM watchlist_coins WHERE DATE(created_at) = DATE('now')").get().c,
    totalSnapshots: db.prepare("SELECT COUNT(*) as c FROM snapshots").get().c,
    coinsWithSnapshots: db.prepare("SELECT COUNT(DISTINCT coin_id) as c FROM snapshots").get().c,
    lastSnapshot: db.prepare("SELECT MAX(created_at) as ts FROM snapshots").get().ts
  };
  
  // v1 top candidates WITH DETAILS
  const v1TopRaw = db.prepare(`
    SELECT 
      w.symbol, w.score, w.criteria_json, w.mc_at_add, w.dexscreener_url,
      s.liquidity_usd, s.volume_24h, s.txns_24h_buys, s.txns_24h_sells, s.market_cap, s.price_usd
    FROM watchlist_coins w
    LEFT JOIN (
      SELECT coin_id, liquidity_usd, volume_24h, txns_24h_buys, txns_24h_sells, market_cap, price_usd
      FROM snapshots
      WHERE (coin_id, ts) IN (SELECT coin_id, MAX(ts) FROM snapshots GROUP BY coin_id)
    ) s ON s.coin_id = w.id
    WHERE w.status = 'active'
    ORDER BY w.score DESC
    LIMIT 10
  `).all();
  
  const v1Top = v1TopRaw.map(c => ({
    symbol: c.symbol,
    score: c.score,
    criteria: c.criteria_json ? JSON.parse(c.criteria_json) : null,
    mc: c.market_cap || c.mc_at_add,
    liq: c.liquidity_usd,
    vol: c.volume_24h,
    buys: c.txns_24h_buys,
    sells: c.txns_24h_sells,
    bsr: c.txns_24h_buys && c.txns_24h_sells ? (c.txns_24h_buys / c.txns_24h_sells).toFixed(2) : null,
    price: c.price_usd,
    url: c.dexscreener_url
  }));
  
  // v2 top candidates WITH DETAILS
  const v2TopRaw = db.prepare(`
    SELECT 
      w.symbol, w.outcome_72h, w.dexscreener_url,
      v2.score_total, v2.pass_hard_filter,
      v2.score_liq25k, v2.score_buys500, v2.score_liq_mc_ratio, v2.score_vol_mc_ratio,
      v2.raw_liq, v2.raw_mc, v2.raw_bsr, v2.raw_buys, v2.raw_vol
    FROM watchlist_coins w
    JOIN criteria_v2_scores v2 ON w.id = v2.coin_id
    WHERE v2.pass_hard_filter = 1
    ORDER BY v2.score_total DESC
    LIMIT 10
  `).all();
  
  const v2Top = v2TopRaw.map(c => ({
    symbol: c.symbol,
    score: c.score_total,
    liq: c.raw_liq,
    mc: c.raw_mc,
    bsr: c.raw_bsr,
    buys: c.raw_buys,
    vol: c.raw_vol,
    outcome: c.outcome_72h,
    scoreLiq25k: c.score_liq25k === 1,
    scoreBuys500: c.score_buys500 === 1,
    scoreLiqMcRatio: c.score_liq_mc_ratio === 1,
    scoreVolMcRatio: c.score_vol_mc_ratio === 1,
    url: c.dexscreener_url
  }));
  
  // Outcomes
  const outcomesRaw = db.prepare(`
    SELECT outcome_72h, COUNT(*) as c 
    FROM watchlist_coins 
    WHERE outcome_72h IS NOT NULL 
    GROUP BY outcome_72h 
    ORDER BY c DESC
  `).all();
  const totalLabeled = outcomesRaw.reduce((sum, o) => sum + o.c, 0);
  const outcomes = outcomesRaw.map(o => ({
    outcome: o.outcome_72h,
    count: o.c,
    pct: ((o.c / totalLabeled) * 100).toFixed(1)
  }));
  
  // v2 stats
  const v2Stats = db.prepare('SELECT COUNT(*) as total, SUM(pass_hard_filter) as passed FROM criteria_v2_scores').get();
  const testDay = Math.ceil((Date.now() - new Date('2026-03-04').getTime()) / (1000*60*60*24));
  
  // Store
  db.prepare(`
    INSERT OR REPLACE INTO daily_reports 
      (report_date, active_coins, new_coins_today, total_snapshots, coins_with_snapshots, last_snapshot_at,
       v1_top_candidates, v2_top_candidates, outcomes_summary,
       v2_coins_passed, v2_test_day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    reportDate, stats.activeCoins, stats.newToday, stats.totalSnapshots, stats.coinsWithSnapshots, stats.lastSnapshot,
    JSON.stringify(v1Top), JSON.stringify(v2Top), JSON.stringify(outcomes),
    v2Stats.passed, testDay
  );
  
  console.log('✅ Daily report stored for ' + reportDate);
  db.close();
  
  return { reportDate, v1Top, v2Top, outcomes, stats, v2Stats, testDay };
}

// When run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  storeDailyReport();
}
