#!/usr/bin/env node
/**
 * Pump.fun Snapshot Job — Main worker
 * 
 * Fetches live data for all active watchlist coins and stores snapshots.
 * Designed to run as a cron job every 6 hours.
 */

import { getDb, initSchema, getActiveCoins, insertSnapshot, setEntryPriceIfEmpty, 
         markSnapshotSuccess, markStale, logAction, importFromCandidates } from './tracker-core.mjs';
import { batchFetchTokens, normalizePair, detectSpike } from './dexscreener-client.mjs';

async function run() {
  const startMs = Date.now();
  const db = getDb();
  initSchema(db);

  // Step 0: Import any new candidates (score >= 8)
  const importResult = importFromCandidates(db);
  if (importResult.imported > 0) {
    console.log(`📥 Imported ${importResult.imported} new coins from candidates`);
  }

  // Step 1: Get active coins
  const coins = getActiveCoins(db);
  if (coins.length === 0) {
    console.log('No active coins to track');
    db.close();
    return;
  }
  console.log(`📡 Tracking ${coins.length} active Pump.fun coins...`);

  // Step 2: Batch fetch from DexScreener
  const addresses = coins.map(c => c.token_address);
  const pairData = await batchFetchTokens(addresses);
  console.log(`📊 DexScreener returned data for ${pairData.size} tokens`);

  // Step 3: Process each coin
  let successCount = 0, errorCount = 0, hotModeCount = 0;
  const errors = [];

  // Get last snapshots for spike detection
  const lastSnapshots = new Map();
  const lastSnapStmt = db.prepare(`
    SELECT coin_id, price_usd, volume_24h FROM snapshots 
    WHERE coin_id = ? ORDER BY ts DESC LIMIT 1
  `);

  const processTx = db.transaction(() => {
    for (const coin of coins) {
      const pair = pairData.get(coin.token_address.toLowerCase());
      
      if (!pair) {
        markStale(db, coin.id);
        if (coin.stale_count + 1 >= 3) {
          console.warn(`⚠️ ${coin.token_name} now stale (${coin.stale_count + 1} misses)`);
        }
        errorCount++;
        continue;
      }

      const data = normalizePair(pair);
      
      // Insert snapshot
      const result = insertSnapshot(db, coin.id, data, coin.snapshot_interval_h || 6);
      
      if (result.changes > 0) {
        successCount++;
        
        // Set entry price if first snapshot
        if (data.priceUsd && !coin.entry_price_usd) {
          setEntryPriceIfEmpty(db, coin.id, data.priceUsd);
          console.log(`💰 Entry price set for ${coin.token_name}: $${data.priceUsd}`);
        }

        // Update token name/symbol if missing
        if (pair.baseToken?.symbol && (!coin.symbol || coin.symbol === '?')) {
          db.prepare('UPDATE watchlist_coins SET symbol = ? WHERE id = ?')
            .run(pair.baseToken.symbol, coin.id);
        }
        if (pair.baseToken?.name && (!coin.token_name || coin.token_name === 'Unknown')) {
          db.prepare('UPDATE watchlist_coins SET token_name = ? WHERE id = ?')
            .run(pair.baseToken.name, coin.id);
        }

        // Update MC at add if missing
        if (data.marketCap && !coin.mc_at_add) {
          db.prepare('UPDATE watchlist_coins SET mc_at_add = ? WHERE id = ?')
            .run(data.marketCap, coin.id);
        }

        // Update DexScreener URL
        if (pair.url && !coin.dexscreener_url) {
          db.prepare('UPDATE watchlist_coins SET dexscreener_url = ? WHERE id = ?')
            .run(pair.url, coin.id);
        }
      }
      
      markSnapshotSuccess(db, coin.id);
      
      // Hot-mode detection
      const lastSnap = lastSnapStmt.get(coin.id);
      if (lastSnap && detectSpike(data, lastSnap)) {
        db.prepare('UPDATE watchlist_coins SET snapshot_interval_h = 1 WHERE id = ? AND snapshot_interval_h > 1')
          .run(coin.id);
        hotModeCount++;
        console.log(`🔥 HOT MODE activated for ${coin.token_name}`);
      }
    }
  });

  processTx();

  // Step 4: Reset hot-mode for coins that have been hot for >48h
  db.prepare(`
    UPDATE watchlist_coins SET snapshot_interval_h = 6 
    WHERE snapshot_interval_h = 1 
    AND last_snapshot_at < datetime('now', '-48 hours')
  `).run();

  // Step 5: Log
  const durationMs = Date.now() - startMs;
  const detail = JSON.stringify({ 
    tracked: coins.length, 
    fetched: pairData.size, 
    success: successCount, 
    errors: errorCount,
    hotMode: hotModeCount,
    newImports: importResult.imported
  });
  logAction(db, 'snapshot', detail, successCount, errorCount, durationMs);

  console.log(`\n✅ Snapshot complete in ${durationMs}ms`);
  console.log(`   Success: ${successCount} | Errors: ${errorCount} | Hot: ${hotModeCount}`);

  db.close();
}

// Run outcome labeler after snapshots
import('./outcome-labeler.mjs').catch(e => console.warn('Labeler skipped:', e.message));

// Run v2.0 criteria scorer in parallel
import('./criteria-v2-scorer.mjs').catch(e => console.warn('v2 Scorer skipped:', e.message));

run().catch(err => {
  console.error('❌ Snapshot job failed:', err);
  process.exit(1);
});
