#!/usr/bin/env node
/**
 * MEXC Listing Checker — Daily job
 * 
 * Checks if any watchlist coins got listed on MEXC.
 * Matches by contract address (high confidence) or symbol (lower confidence).
 */

import https from 'https';
import { getDb, initSchema, getActiveCoins, logAction } from './tracker-core.mjs';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('JSON parse error')); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const startMs = Date.now();
  const db = getDb();
  initSchema(db);

  const coins = getActiveCoins(db);
  if (coins.length === 0) {
    console.log('No active coins to check');
    db.close();
    return;
  }

  // Fetch MEXC exchange info
  let mexcSymbols;
  try {
    mexcSymbols = await fetchJson('https://api.mexc.com/api/v3/exchangeInfo');
  } catch (err) {
    console.error('❌ Failed to fetch MEXC exchangeInfo:', err.message);
    logAction(db, 'mexc_check', `Failed: ${err.message}`, 0, 1, Date.now() - startMs);
    db.close();
    return;
  }

  const mexcList = mexcSymbols.symbols || [];
  console.log(`📊 MEXC has ${mexcList.length} trading pairs`);

  // Build lookup maps
  const mexcBySymbol = new Map();
  for (const s of mexcList) {
    if (s.quoteAsset === 'USDT' && s.status === 'ENABLED') {
      mexcBySymbol.set(s.baseAsset.toUpperCase(), s);
    }
  }

  const insertListing = db.prepare(`
    INSERT OR IGNORE INTO exchange_listings 
    (coin_id, exchange, market_symbol, match_type, confidence)
    VALUES (?, 'MEXC', ?, ?, ?)
  `);

  const existingListings = new Set(
    db.prepare(`SELECT coin_id FROM exchange_listings WHERE exchange = 'MEXC'`).all().map(r => r.coin_id)
  );

  let newListings = [];

  for (const coin of coins) {
    if (existingListings.has(coin.id)) continue;

    const symbol = (coin.symbol || '').toUpperCase();
    const mexcMatch = mexcBySymbol.get(symbol);

    if (mexcMatch) {
      insertListing.run(coin.id, `${symbol}USDT`, 'symbol', 0.7);
      newListings.push({ coin, matchType: 'symbol', market: `${symbol}USDT` });
      console.log(`🏦 NEW LISTING: ${coin.token_name} (${symbol}) on MEXC!`);
    }
  }

  const durationMs = Date.now() - startMs;
  logAction(db, 'mexc_check', JSON.stringify({ 
    checked: coins.length, 
    newListings: newListings.length 
  }), coins.length, 0, durationMs);

  console.log(`\n✅ MEXC check complete in ${durationMs}ms`);
  console.log(`   Checked: ${coins.length} | New listings: ${newListings.length}`);

  db.close();
  
  // Return new listings for alerting
  return newListings;
}

run().catch(err => {
  console.error('❌ MEXC checker failed:', err);
  process.exit(1);
});
