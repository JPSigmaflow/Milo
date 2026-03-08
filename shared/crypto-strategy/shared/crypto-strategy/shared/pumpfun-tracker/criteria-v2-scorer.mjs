#!/usr/bin/env node
/**
 * Criteria v2.0 Parallel Scorer
 * Runs alongside existing scoring, stores v2 scores for comparison.
 * 
 * Hard Filters:
 *   ① Liquidity >= $14K
 *   ② MC at Entry: $15K - $200K
 *   ③ Buy/Sell Ratio >= 1.10
 * 
 * Scoring (0-7):
 *   ④ Liquidity >= $25K (+1)
 *   ⑤ Buys >= 500 in 24h (+1)
 *   ⑥ Liq/MC Ratio 15-50% (+1)
 *   ⑦ Volume/MC >= 0.8x (+1)
 *   ⑧ Community Momentum - rising buys across snapshots (+1)
 *   ⑨ Social Virality - BiliBili/Douyin/TikTok/Reddit/Twitter (+2)
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'pumpfun-tracker.db');

export function initV2Schema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS criteria_v2_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coin_id INTEGER NOT NULL,
      pass_hard_filter BOOLEAN NOT NULL,
      filter_liq BOOLEAN,
      filter_mc BOOLEAN,
      filter_bsr BOOLEAN,
      score_total INTEGER DEFAULT 0,
      score_liq25k BOOLEAN DEFAULT 0,
      score_buys500 BOOLEAN DEFAULT 0,
      score_liq_mc_ratio BOOLEAN DEFAULT 0,
      score_vol_mc_ratio BOOLEAN DEFAULT 0,
      score_community_momentum BOOLEAN DEFAULT 0,
      score_social_virality INTEGER DEFAULT 0,
      raw_liq REAL,
      raw_mc REAL,
      raw_bsr REAL,
      raw_buys INTEGER,
      raw_vol REAL,
      scored_at TEXT DEFAULT (datetime('now')),
      UNIQUE(coin_id)
    );
  `);
}

export function scoreV2(db, coinId, snapshot, prevSnapshots = []) {
  const liq = snapshot.liquidity_usd || 0;
  const mc = snapshot.market_cap || 0;
  const buys = snapshot.txns_24h_buys || 0;
  const sells = snapshot.txns_24h_sells || 1;
  const vol = snapshot.volume_24h || 0;
  const bsr = buys / sells;

  // Hard Filters
  const filterLiq = liq >= 14000;
  const filterMc = mc >= 15000 && mc <= 200000;
  const filterBsr = bsr >= 1.10;
  const passHard = filterLiq && filterMc && filterBsr;

  // Scoring
  let score = 0;
  const scoreLiq25k = liq >= 25000;
  const scoreBuys500 = buys >= 500;
  const liqMcRatio = mc > 0 ? liq / mc : 0;
  const scoreLiqMcRatio = liqMcRatio >= 0.15 && liqMcRatio <= 0.50;
  const volMcRatio = mc > 0 ? vol / mc : 0;
  const scoreVolMcRatio = volMcRatio >= 0.8;
  
  // Community Momentum: rising buys across last 3+ snapshots
  let scoreCommunityMomentum = false;
  if (prevSnapshots.length >= 2) {
    const recentBuys = prevSnapshots.slice(-3).map(s => s.txns_24h_buys || 0);
    const rising = recentBuys.every((v, i) => i === 0 || v >= recentBuys[i-1]);
    scoreCommunityMomentum = rising && recentBuys[recentBuys.length-1] > recentBuys[0] * 1.1;
  }
  
  // Social Virality: placeholder (needs external data)
  const scoreSocialVirality = 0;

  if (scoreLiq25k) score++;
  if (scoreBuys500) score++;
  if (scoreLiqMcRatio) score++;
  if (scoreVolMcRatio) score++;
  if (scoreCommunityMomentum) score++;
  score += scoreSocialVirality;

  // Upsert
  db.prepare(`
    INSERT INTO criteria_v2_scores 
      (coin_id, pass_hard_filter, filter_liq, filter_mc, filter_bsr,
       score_total, score_liq25k, score_buys500, score_liq_mc_ratio, score_vol_mc_ratio,
       score_community_momentum, score_social_virality,
       raw_liq, raw_mc, raw_bsr, raw_buys, raw_vol, scored_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(coin_id) DO UPDATE SET
      pass_hard_filter=excluded.pass_hard_filter,
      filter_liq=excluded.filter_liq, filter_mc=excluded.filter_mc, filter_bsr=excluded.filter_bsr,
      score_total=excluded.score_total, score_liq25k=excluded.score_liq25k,
      score_buys500=excluded.score_buys500, score_liq_mc_ratio=excluded.score_liq_mc_ratio,
      score_vol_mc_ratio=excluded.score_vol_mc_ratio, score_community_momentum=excluded.score_community_momentum,
      score_social_virality=excluded.score_social_virality,
      raw_liq=excluded.raw_liq, raw_mc=excluded.raw_mc, raw_bsr=excluded.raw_bsr,
      raw_buys=excluded.raw_buys, raw_vol=excluded.raw_vol, scored_at=excluded.scored_at
  `).run(coinId, passHard ? 1 : 0, filterLiq ? 1 : 0, filterMc ? 1 : 0, filterBsr ? 1 : 0,
         score, scoreLiq25k ? 1 : 0, scoreBuys500 ? 1 : 0, scoreLiqMcRatio ? 1 : 0, 
         scoreVolMcRatio ? 1 : 0, scoreCommunityMomentum ? 1 : 0, scoreSocialVirality,
         liq, mc, bsr, buys, vol);

  return { passHard, score, filterLiq, filterMc, filterBsr };
}

// Write to criteria_comparison table (historical tracking — Juri requirement)
export function writeComparison(db, coinId, snapshot, v2Result, v1Score, v1CriteriaJson) {
  const liq = snapshot.liquidity_usd || 0;
  const mc = snapshot.market_cap || 0;
  const buys = snapshot.txns_24h_buys || 0;
  const sells = snapshot.txns_24h_sells || 1;
  const vol = snapshot.volume_24h || 0;
  const bsr = buys / sells;

  db.prepare(`
    INSERT OR IGNORE INTO criteria_comparison 
      (coin_id, snapshot_ts, v1_score, v1_criteria_json,
       v2_pass_hard_filter, v2_filter_liq, v2_filter_mc, v2_filter_bsr,
       v2_score_total, v2_score_liq25k, v2_score_buys500, v2_score_liq_mc_ratio,
       v2_score_vol_mc_ratio, v2_score_community_momentum, v2_score_social_virality,
       raw_liq, raw_mc, raw_bsr, raw_buys, raw_sells, raw_vol, raw_price)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    coinId, snapshot.ts, v1Score || null, v1CriteriaJson || null,
    v2Result.passHard ? 1 : 0, v2Result.filterLiq ? 1 : 0, 
    v2Result.filterMc ? 1 : 0, v2Result.filterBsr ? 1 : 0,
    v2Result.score, v2Result.scoreLiq25k ? 1 : 0, v2Result.scoreBuys500 ? 1 : 0,
    v2Result.scoreLiqMcRatio ? 1 : 0, v2Result.scoreVolMcRatio ? 1 : 0,
    v2Result.scoreCommunityMomentum ? 1 : 0, 0,
    liq, mc, bsr, buys, sells, vol, snapshot.price_usd
  );
}

// CLI: Score all active coins with latest snapshot
if (process.argv[1] && process.argv[1].includes('criteria-v2-scorer')) {
  const db = new Database(DB_PATH);
  initV2Schema(db);
  
  const coins = db.prepare("SELECT id, symbol, score, criteria_json FROM watchlist_coins WHERE status = 'active'").all();
  let scored = 0, passed = 0;
  
  for (const coin of coins) {
    const snap = db.prepare('SELECT * FROM snapshots WHERE coin_id = ? ORDER BY ts DESC LIMIT 1').get(coin.id);
    if (!snap) continue;
    
    const prevSnaps = db.prepare('SELECT * FROM snapshots WHERE coin_id = ? ORDER BY ts DESC LIMIT 4').all(coin.id).reverse();
    
    const result = scoreV2(db, coin.id, snap, prevSnaps);
    writeComparison(db, coin.id, snap, result, coin.score, coin.criteria_json);
    scored++;
    if (result.passHard) passed++;
  }
  
  console.log(`✅ v2.0 Scored ${scored} coins | ${passed} passed hard filter`);
  
  // Summary
  const summary = db.prepare(`
    SELECT pass_hard_filter, COUNT(*) as c, AVG(score_total) as avg_score 
    FROM criteria_v2_scores GROUP BY pass_hard_filter
  `).all();
  summary.forEach(s => {
    console.log(`${s.pass_hard_filter ? 'PASS' : 'FAIL'}: ${s.c} coins, avg score: ${s.avg_score.toFixed(1)}`);
  });
  
  const compCount = db.prepare('SELECT COUNT(*) as c FROM criteria_comparison').get();
  console.log(`📊 Comparison records: ${compCount.c}`);
  
  db.close();
}
