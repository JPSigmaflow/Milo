#!/usr/bin/env node
// Fetch live prices from DexScreener and update pumpfun-data.json
import { readFileSync, writeFileSync } from 'fs';

const DATA_FILE = new URL('./pumpfun-data.json', import.meta.url).pathname;

async function run() {
  const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  const coins = data.coins || [];
  if (!coins.length) { console.log('No coins'); return; }

  // Batch fetch — DexScreener supports comma-separated addresses
  const addresses = coins.map(c => c.contract).filter(Boolean);
  const batchSize = 30;
  const priceMap = new Map();

  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize).join(',');
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${batch}`);
      const json = await res.json();
      for (const pair of (json.pairs || [])) {
        const addr = pair.baseToken?.address;
        if (addr && !priceMap.has(addr)) {
          priceMap.set(addr, {
            price: parseFloat(pair.priceUsd) || 0,
            mc: pair.fdv || pair.marketCap || 0,
            volume_24h: pair.volume?.h24 || 0,
            volume_1h: pair.volume?.h1 || 0,
            liquidity: pair.liquidity?.usd || 0,
            change_1h: pair.priceChange?.h1 || 0,
            change_24h: pair.priceChange?.h24 || 0
          });
        }
      }
    } catch (e) {
      console.error('DexScreener error:', e.message);
    }
  }

  // Update coins with live prices
  let updated = 0;
  for (const coin of coins) {
    const live = priceMap.get(coin.contract);
    if (live && live.price > 0) {
      coin.price = live.price;
      coin.mc = live.mc;
      coin.volume_24h = live.volume_24h;
      coin.volume_1h = live.volume_1h;
      coin.liquidity = live.liquidity;
      coin.change_1h = live.change_1h;
      coin.change_24h = live.change_24h;
      if (coin.entry_price > 0) {
        coin.change_since_entry = Math.round((live.price - coin.entry_price) / coin.entry_price * 10000) / 100;
      }
      updated++;
    }
  }

  data.exported_at = new Date().toISOString();
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log(`✅ Updated ${updated}/${coins.length} coins with live prices`);
}

run().catch(e => { console.error(e); process.exit(1); });
