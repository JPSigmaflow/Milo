#!/usr/bin/env node
/**
 * MEXC New Listing Monitor
 * Checks for new USDT trading pairs on MEXC and outputs alerts.
 * Run periodically via cron. Stores known symbols in symbols.json.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SYMBOLS_FILE = path.join(__dirname, 'symbols.json');

const fetch = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => resolve({ status: res.statusCode, data }));
  }).on('error', reject);
});

async function getTickerInfo(symbol) {
  try {
    const r = await fetch(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${symbol}`);
    if (r.status === 200) return JSON.parse(r.data);
  } catch (e) {}
  return null;
}

async function main() {
  // 1. Fetch current MEXC symbols
  const r = await fetch('https://api.mexc.com/api/v3/defaultSymbols');
  const allSyms = JSON.parse(r.data);
  const list = allSyms.data || allSyms;
  const usdtPairs = list.filter(s => s.endsWith('USDT'));

  // 2. Load known symbols
  let known = [];
  if (fs.existsSync(SYMBOLS_FILE)) {
    known = JSON.parse(fs.readFileSync(SYMBOLS_FILE, 'utf8'));
  }

  const knownSet = new Set(known);
  const newPairs = usdtPairs.filter(s => !knownSet.has(s));

  // 3. Save updated list
  fs.writeFileSync(SYMBOLS_FILE, JSON.stringify(usdtPairs, null, 0));

  // 4. If first run, just save baseline
  if (known.length === 0) {
    console.log(JSON.stringify({ firstRun: true, totalPairs: usdtPairs.length }));
    return;
  }

  // 5. If no new pairs
  if (newPairs.length === 0) {
    console.log(JSON.stringify({ newListings: [] }));
    return;
  }

  // 6. Get details for new pairs
  const results = [];
  for (const sym of newPairs) {
    const ticker = await getTickerInfo(sym);
    const coin = sym.replace('USDT', '');
    results.push({
      symbol: coin,
      pair: sym,
      price: ticker?.lastPrice || 'unknown',
      volume24h: ticker?.quoteVolume || '0',
      change24h: ticker?.priceChangePercent || '0'
    });
  }

  console.log(JSON.stringify({ newListings: results }));
}

main().catch(e => {
  console.error('Monitor error:', e.message);
  process.exit(1);
});
