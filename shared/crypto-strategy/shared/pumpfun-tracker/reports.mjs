#!/usr/bin/env node
/**
 * Pump.fun Tracker — Reports & Analytics
 */

import { getDb, initSchema } from './tracker-core.mjs';

const db = getDb();
initSchema(db);

const cmd = process.argv[2] || 'summary';

if (cmd === 'summary') {
  // Overall watchlist summary
  const coins = db.prepare(`
    SELECT w.*, 
      (SELECT COUNT(*) FROM snapshots s WHERE s.coin_id = w.id) as snap_count,
      (SELECT MAX(s.price_usd) FROM snapshots s WHERE s.coin_id = w.id) as ath_price,
      (SELECT MIN(s.price_usd) FROM snapshots s WHERE s.coin_id = w.id AND s.price_usd > 0) as atl_price,
      (SELECT s.price_usd FROM snapshots s WHERE s.coin_id = w.id ORDER BY s.ts DESC LIMIT 1) as current_price,
      (SELECT s.market_cap FROM snapshots s WHERE s.coin_id = w.id ORDER BY s.ts DESC LIMIT 1) as current_mc,
      (SELECT e.exchange FROM exchange_listings e WHERE e.coin_id = w.id LIMIT 1) as listed_on
    FROM watchlist_coins w
    ORDER BY w.status, w.score DESC
  `).all();

  console.log(`\n📊 PUMP.FUN TRACKER — ${coins.length} Coins\n`);
  console.log('Status | Score | Token | Entry $ | Current $ | ROI% | ATH $ | Snaps | CEX');
  console.log('-'.repeat(90));

  for (const c of coins) {
    const roi = (c.entry_price_usd && c.current_price) 
      ? ((c.current_price - c.entry_price_usd) / c.entry_price_usd * 100).toFixed(1)
      : 'n/a';
    console.log(
      `${c.status.padEnd(8)} | ${String(c.score||'?').padEnd(5)} | ${(c.token_name||'?').substring(0,20).padEnd(20)} | ` +
      `$${(c.entry_price_usd||0).toFixed(6).padEnd(10)} | $${(c.current_price||0).toFixed(6).padEnd(10)} | ` +
      `${String(roi).padEnd(7)}% | $${(c.ath_price||0).toFixed(6).padEnd(10)} | ${String(c.snap_count).padEnd(5)} | ${c.listed_on||'-'}`
    );
  }
}

if (cmd === 'performance') {
  const coinId = process.argv[3];
  if (!coinId) { console.log('Usage: reports.mjs performance <coin_id>'); process.exit(1); }
  
  const coin = db.prepare('SELECT * FROM watchlist_coins WHERE id = ?').get(coinId);
  if (!coin) { console.log('Coin not found'); process.exit(1); }
  
  const snaps = db.prepare('SELECT * FROM snapshots WHERE coin_id = ? ORDER BY ts').all(coinId);
  
  console.log(`\n📈 ${coin.token_name} (${coin.symbol}) — Performance Report`);
  console.log(`Entry: $${coin.entry_price_usd || 'n/a'} | Score: ${coin.score} | Status: ${coin.status}`);
  console.log(`Snapshots: ${snaps.length}\n`);
  
  if (snaps.length > 0) {
    const prices = snaps.filter(s => s.price_usd > 0).map(s => s.price_usd);
    const ath = Math.max(...prices);
    const atl = Math.min(...prices);
    const current = prices[prices.length - 1];
    const maxDrawdown = ((atl - ath) / ath * 100).toFixed(1);
    
    console.log(`ATH: $${ath} | ATL: $${atl} | Current: $${current}`);
    console.log(`Max Drawdown from ATH: ${maxDrawdown}%`);
    
    if (coin.entry_price_usd) {
      console.log(`ROI since entry: ${((current - coin.entry_price_usd) / coin.entry_price_usd * 100).toFixed(1)}%`);
    }
    
    console.log('\nTimeline:');
    for (const s of snaps.slice(-10)) {
      console.log(`  ${s.ts} | $${s.price_usd?.toFixed(8)} | MC: $${(s.market_cap||0).toLocaleString()} | Vol: $${(s.volume_24h||0).toLocaleString()}`);
    }
  }
}

if (cmd === 'top') {
  const coins = db.prepare(`
    SELECT w.token_name, w.symbol, w.entry_price_usd, w.score,
      (SELECT s.price_usd FROM snapshots s WHERE s.coin_id = w.id ORDER BY s.ts DESC LIMIT 1) as current_price
    FROM watchlist_coins w
    WHERE w.status = 'active' AND w.entry_price_usd > 0
  `).all();

  const ranked = coins
    .filter(c => c.current_price && c.entry_price_usd)
    .map(c => ({ ...c, roi: (c.current_price - c.entry_price_usd) / c.entry_price_usd * 100 }))
    .sort((a, b) => b.roi - a.roi);

  console.log('\n🏆 TOP PERFORMERS\n');
  ranked.slice(0, 10).forEach((c, i) => {
    console.log(`${i+1}. ${c.token_name} (${c.symbol}) — ROI: ${c.roi.toFixed(1)}% | Score: ${c.score}`);
  });

  console.log('\n💀 WORST PERFORMERS\n');
  ranked.slice(-5).reverse().forEach((c, i) => {
    console.log(`${i+1}. ${c.token_name} (${c.symbol}) — ROI: ${c.roi.toFixed(1)}% | Score: ${c.score}`);
  });
}

db.close();
