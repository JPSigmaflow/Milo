#!/usr/bin/env node
/**
 * Pump.fun Graduation Monitor
 * 
 * Detects newly graduated Pump.fun tokens using DexScreener API (free, no key).
 * Strategy: Track tokens boosted on DexScreener with 'pump' addresses (= pump.fun tokens)
 * that recently created pairs (graduated to PumpSwap/Raydium).
 * 
 * Filters:
 * - Market Cap > $50K (survived initial dump)
 * - 24h Volume > $100K (real trading activity)
 * - Pair age < 48h (fresh graduation)
 * - Liquidity > $20K (tradeable)
 * 
 * Outputs JSON array of qualifying tokens.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SEEN_FILE = path.join(__dirname, 'seen-tokens.json');
const STATS_FILE = path.join(__dirname, 'stats.json');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(data)); } 
          catch(e) { reject(new Error('JSON parse error')); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // Load seen tokens
  let seen = {};
  if (fs.existsSync(SEEN_FILE)) {
    seen = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'));
  }

  // Clean old entries (>7 days)
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  for (const [k, v] of Object.entries(seen)) {
    if (v < weekAgo) delete seen[k];
  }

  const alerts = [];

  // Strategy 1: DexScreener boosted tokens (pump.fun addresses)
  try {
    const boosts = await fetch('https://api.dexscreener.com/token-boosts/latest/v1');
    const pumpTokens = boosts
      .filter(t => t.chainId === 'solana' && t.tokenAddress.endsWith('pump'))
      .slice(0, 20);
    
    for (const t of pumpTokens) {
      if (seen[t.tokenAddress]) continue;
      
      await sleep(300); // Rate limit
      try {
        const pairs = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${t.tokenAddress}`);
        const p = pairs[0];
        if (!p) continue;

        const ageHours = p.pairCreatedAt ? (Date.now() - p.pairCreatedAt) / 3600000 : 999;
        const mc = p.marketCap || 0;
        const vol = p.volume?.h24 || 0;
        const liq = p.liquidity?.usd || 0;

        if (ageHours < 48 && mc > 50000 && vol > 100000 && liq > 20000) {
          alerts.push({
            symbol: p.baseToken?.symbol || 'UNKNOWN',
            name: p.baseToken?.name || '',
            address: t.tokenAddress,
            price: p.priceUsd,
            marketCap: Math.round(mc),
            volume24h: Math.round(vol),
            liquidity: Math.round(liq),
            ageHours: Math.round(ageHours),
            change24h: p.priceChange?.h24 || 0,
            txns24h: (p.txns?.h24?.buys || 0) + (p.txns?.h24?.sells || 0),
            dexUrl: p.url || `https://dexscreener.com/solana/${t.tokenAddress}`
          });
        }
      } catch (e) { /* skip individual failures */ }
    }
  } catch (e) {
    console.error('Boost fetch error:', e.message);
  }

  // Strategy 2: DexScreener latest profiles (pump.fun tokens)
  try {
    const profiles = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
    const pumpProfiles = profiles
      .filter(t => t.chainId === 'solana' && t.tokenAddress.endsWith('pump'))
      .slice(0, 15);

    for (const t of pumpProfiles) {
      if (seen[t.tokenAddress]) continue;
      
      await sleep(300);
      try {
        const pairs = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${t.tokenAddress}`);
        const p = pairs[0];
        if (!p) continue;

        const ageHours = p.pairCreatedAt ? (Date.now() - p.pairCreatedAt) / 3600000 : 999;
        const mc = p.marketCap || 0;
        const vol = p.volume?.h24 || 0;
        const liq = p.liquidity?.usd || 0;

        // Check if not already in alerts
        if (alerts.some(a => a.address === t.tokenAddress)) continue;

        if (ageHours < 48 && mc > 50000 && vol > 100000 && liq > 20000) {
          alerts.push({
            symbol: p.baseToken?.symbol || 'UNKNOWN',
            name: p.baseToken?.name || '',
            address: t.tokenAddress,
            price: p.priceUsd,
            marketCap: Math.round(mc),
            volume24h: Math.round(vol),
            liquidity: Math.round(liq),
            ageHours: Math.round(ageHours),
            change24h: p.priceChange?.h24 || 0,
            txns24h: (p.txns?.h24?.buys || 0) + (p.txns?.h24?.sells || 0),
            dexUrl: p.url || `https://dexscreener.com/solana/${t.tokenAddress}`
          });
        }
      } catch (e) { /* skip */ }
    }
  } catch (e) {
    console.error('Profile fetch error:', e.message);
  }

  // Mark all found tokens as seen
  for (const a of alerts) {
    seen[a.address] = Date.now();
  }
  fs.writeFileSync(SEEN_FILE, JSON.stringify(seen));

  // Update stats
  const stats = fs.existsSync(STATS_FILE) ? JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')) : { runs: 0, totalAlerts: 0 };
  stats.runs++;
  stats.totalAlerts += alerts.length;
  stats.lastRun = new Date().toISOString();
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));

  // Output
  console.log(JSON.stringify({ newGraduations: alerts }));
}

main().catch(e => {
  console.error('Monitor error:', e.message);
  process.exit(1);
});
