#!/usr/bin/env node
/**
 * Outcome Labeler — Klassifiziert Coins nach 72h und 14d
 * 
 * Runs periodically to label coins based on their performance since entry.
 * Labels: exploder, mild_exploder, normal, fail, rug
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'pumpfun-tracker.db');

// Thresholds (LOCKED — see GOVERNANCE.md)
const THRESHOLDS = {
  exploder_72h: 3.0,      // +300% in 72h
  exploder_14d: 10.0,     // +1000% in 14d
  mild_72h: 1.0,          // +100% in 72h
  mild_14d: 3.0,          // +300% in 14d
  fail_drawdown: -0.80,   // -80% from entry
  rug_liq_drop: -0.70,    // -70% liquidity in 24h
};

function classify(roi, maxDrawdown, liqDrop) {
  // Rug check first
  if (liqDrop !== null && liqDrop <= THRESHOLDS.rug_liq_drop) return 'rug';
  // Fail check
  if (maxDrawdown !== null && maxDrawdown <= THRESHOLDS.fail_drawdown) return 'fail';
  // Exploder (must not be a rug with dead-cat-bounce: liq must not have dropped > 50%)
  if (roi >= THRESHOLDS.exploder_72h && (liqDrop === null || liqDrop > -0.5)) return 'exploder';
  if (roi >= THRESHOLDS.mild_72h) return 'mild_exploder';
  return 'normal';
}

function run() {
  const db = new Database(DB_PATH);
  const now = Date.now();

  const coins = db.prepare(`
    SELECT w.id, w.token_name, w.entry_price_usd, w.added_at, 
           w.outcome_72h, w.outcome_14d, w.ath_price_usd
    FROM watchlist_coins w
    WHERE w.entry_price_usd IS NOT NULL AND w.entry_price_usd > 0
  `).all();

  let labeled72h = 0, labeled14d = 0, athUpdated = 0;

  for (const coin of coins) {
    const addedMs = new Date(coin.added_at).getTime();
    const hoursSinceAdd = (now - addedMs) / (3600 * 1000);

    // Get all snapshots
    const snaps = db.prepare(`
      SELECT price_usd, liquidity_usd, ts FROM snapshots 
      WHERE coin_id = ? AND price_usd > 0 ORDER BY ts
    `).all(coin.id);

    if (snaps.length === 0) continue;

    const entry = coin.entry_price_usd;
    const prices = snaps.map(s => s.price_usd);
    const ath = Math.max(...prices);
    const atl = Math.min(...prices);
    const current = prices[prices.length - 1];
    const maxDrawdown = (atl - entry) / entry;

    // Update ATH/ATL
    if (!coin.ath_price_usd || ath > coin.ath_price_usd) {
      const athSnap = snaps.find(s => s.price_usd === ath);
      db.prepare('UPDATE watchlist_coins SET ath_price_usd = ?, ath_at = ? WHERE id = ?')
        .run(ath, athSnap?.ts, coin.id);
      athUpdated++;
    }
    if (atl > 0) {
      db.prepare('UPDATE watchlist_coins SET atl_price_usd = ? WHERE id = ?').run(atl, coin.id);
    }
    db.prepare('UPDATE watchlist_coins SET max_drawdown_pct = ? WHERE id = ?')
      .run(maxDrawdown * 100, coin.id);

    // Liquidity drop check (compare first and latest liquidity)
    const liqSnaps = snaps.filter(s => s.liquidity_usd > 0);
    let liqDrop = null;
    if (liqSnaps.length >= 2) {
      const firstLiq = liqSnaps[0].liquidity_usd;
      const lastLiq = liqSnaps[liqSnaps.length - 1].liquidity_usd;
      liqDrop = (lastLiq - firstLiq) / firstLiq;
    }

    // 72h label (after 72h have passed)
    if (hoursSinceAdd >= 72 && !coin.outcome_72h) {
      // Get snapshots within first 72h
      const cutoff72h = new Date(addedMs + 72 * 3600 * 1000).toISOString();
      const snaps72h = snaps.filter(s => s.ts <= cutoff72h);
      if (snaps72h.length > 0) {
        const maxPrice72h = Math.max(...snaps72h.map(s => s.price_usd));
        const roi72h = (maxPrice72h - entry) / entry;
        const minPrice72h = Math.min(...snaps72h.map(s => s.price_usd));
        const dd72h = (minPrice72h - entry) / entry;
        const label = classify(roi72h, dd72h, liqDrop);
        
        db.prepare('UPDATE watchlist_coins SET outcome_72h = ?, labeled_at = datetime(\'now\') WHERE id = ?')
          .run(label, coin.id);
        console.log(`🏷️ 72h: ${coin.token_name} → ${label} (ROI: ${(roi72h*100).toFixed(1)}%, DD: ${(dd72h*100).toFixed(1)}%)`);
        labeled72h++;
      }
    }

    // 14d label (after 14 days)
    if (hoursSinceAdd >= 336 && !coin.outcome_14d) {
      const roi14d = (current - entry) / entry;
      const label = classify(roi14d, maxDrawdown, liqDrop);
      
      // Use higher thresholds for 14d
      let finalLabel;
      if (liqDrop !== null && liqDrop <= THRESHOLDS.rug_liq_drop) finalLabel = 'rug';
      else if (maxDrawdown <= THRESHOLDS.fail_drawdown) finalLabel = 'fail';
      else if (roi14d >= THRESHOLDS.exploder_14d) finalLabel = 'exploder';
      else if (roi14d >= THRESHOLDS.mild_14d) finalLabel = 'mild_exploder';
      else finalLabel = 'normal';

      db.prepare('UPDATE watchlist_coins SET outcome_14d = ?, outcome_final = ?, labeled_at = datetime(\'now\') WHERE id = ?')
        .run(finalLabel, finalLabel, coin.id);
      console.log(`🏷️ 14d: ${coin.token_name} → ${finalLabel} (ROI: ${(roi14d*100).toFixed(1)}%)`);
      labeled14d++;
    }
  }

  console.log(`\n✅ Labeling: ${labeled72h} 72h-Labels, ${labeled14d} 14d-Labels, ${athUpdated} ATH-Updates`);
  db.close();
}

run();
