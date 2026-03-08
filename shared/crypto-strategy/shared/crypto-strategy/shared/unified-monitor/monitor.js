#!/usr/bin/env node
'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const STATE_FILE = path.join(DIR, 'state.json');
const MEXC_FILE = path.join(DIR, 'mexc-symbols.json');
const WATCHLIST_FILE = path.join(DIR, 'watchlist.json');
const SEEN_PUMP_FILE = path.join(DIR, '..', 'pumpfun-monitor', 'seen-tokens.json');

// --- Helpers ---

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'UnifiedMonitor/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve, reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

const delay = ms => new Promise(r => setTimeout(r, ms));

function calcScore(token) {
  let score = 40;
  const mc = token.marketCap || 0;
  const vol = token.volume24h || 0;
  const age = token.ageHours ?? 999;
  const volMcRatio = mc > 0 ? vol / mc : 0;

  if (mc > 5000000) score += 20;
  else if (mc > 500000) score += 15;
  else if (mc > 50000) score += 10;

  if (volMcRatio > 1) score += 20;
  else if (volMcRatio > 0.5) score += 15;

  if (age < 6) score += 15;
  else if (age < 12) score += 10;
  else if (age < 24) score += 5;

  if (token.sources && token.sources.length > 1) score += 10;
  if (token.promoted) score += 10;
  if ((token.txns || 0) > 5000) score += 10;

  return score;
}

function priority(score) {
  if (score > 80) return 'HIGH';
  if (score > 60) return 'MEDIUM';
  return 'LOW';
}

// --- Data Sources ---

async function fetchPumpGraduations(seenTokens) {
  const alerts = [];
  let boosts = [], profiles = [];

  try { boosts = await fetch('https://api.dexscreener.com/token-boosts/latest/v1'); } catch (e) { console.error('Boosts error:', e.message); }
  await delay(300);
  try { profiles = await fetch('https://api.dexscreener.com/token-profiles/latest/v1'); } catch (e) { console.error('Profiles error:', e.message); }

  if (!Array.isArray(boosts)) boosts = [];
  if (!Array.isArray(profiles)) profiles = [];

  // Collect Solana pump tokens
  const tokenMap = new Map();

  for (const b of boosts) {
    if (b.chainId === 'solana' && b.tokenAddress && b.tokenAddress.endsWith('pump')) {
      const entry = tokenMap.get(b.tokenAddress) || { address: b.tokenAddress, sources: [] };
      if (!entry.sources.includes('dexscreener_boost')) entry.sources.push('dexscreener_boost');
      entry.totalBoost = (entry.totalBoost || 0) + (b.amount || 0);
      tokenMap.set(b.tokenAddress, entry);
    }
  }

  for (const p of profiles) {
    if (p.chainId === 'solana' && p.tokenAddress && p.tokenAddress.endsWith('pump')) {
      const entry = tokenMap.get(p.tokenAddress) || { address: p.tokenAddress, sources: [] };
      if (!entry.sources.includes('dexscreener_profile')) entry.sources.push('dexscreener_profile');
      entry.name = p.name || entry.name;
      entry.description = p.description || entry.description;
      tokenMap.set(p.tokenAddress, entry);
    }
  }

  // Filter already seen
  const candidates = [...tokenMap.values()].filter(t => !seenTokens[t.address]);

  // Fetch pair data (with rate limiting)
  for (const token of candidates.slice(0, 20)) { // cap at 20 to avoid rate limits
    await delay(300);
    try {
      const pairs = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${token.address}`);
      if (!Array.isArray(pairs) || pairs.length === 0) continue;

      const pair = pairs[0];
      const mc = pair.marketCap || pair.fdv || 0;
      const vol = pair.volume?.h24 || 0;
      const liq = pair.liquidity?.usd || 0;
      const createdAt = pair.pairCreatedAt || 0;
      const ageHours = createdAt ? (Date.now() - createdAt) / 3600000 : 999;

      // Filters
      if (mc < 50000 || vol < 100000 || liq < 20000 || ageHours > 48) continue;

      const flags = [];
      if (vol / mc > 0.3) flags.push('high_volume');
      if (token.sources.length > 1) flags.push('multi_source');
      
      const alert = {
        type: 'graduation',
        symbol: pair.baseToken?.symbol || 'UNKNOWN',
        name: pair.baseToken?.name || token.name || 'Unknown',
        address: token.address,
        price: pair.priceUsd || '0',
        marketCap: mc,
        volume24h: vol,
        liquidity: liq,
        change24h: pair.priceChange?.h24 || 0,
        ageHours: Math.round(ageHours * 10) / 10,
        sources: [...token.sources],
        txns: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
        promoted: false,
        dexUrl: pair.url || `https://dexscreener.com/solana/${token.address}`,
        flags
      };

      // Check promotion
      await delay(300);
      try {
        const orders = await fetch(`https://api.dexscreener.com/orders/v1/solana/${token.address}`);
        if (Array.isArray(orders) && orders.length > 0) {
          alert.promoted = true;
          alert.flags.push('promoted');
        }
      } catch {}

      alert.score = calcScore(alert);
      alert.priority = priority(alert.score);
      alerts.push(alert);
    } catch (e) {
      console.error(`Pair fetch error for ${token.address.slice(0, 8)}...: ${e.message}`);
    }
  }

  return alerts;
}

async function fetchMexcListings(mexcBaseline) {
  const alerts = [];
  try {
    const data = await fetch('https://api.mexc.com/api/v3/defaultSymbols');
    if (!data || !data.data) return { alerts, symbols: mexcBaseline };

    const currentSymbols = data.data;
    const baselineSet = new Set(mexcBaseline);
    const newSymbols = currentSymbols.filter(s => !baselineSet.has(s) && s.endsWith('USDT'));

    for (const sym of newSymbols.slice(0, 10)) {
      await delay(200);
      try {
        const ticker = await fetch(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${sym}`);
        alerts.push({
          type: 'mexc_listing',
          symbol: sym.replace('USDT', ''),
          name: sym.replace('USDT', ''),
          address: sym,
          price: ticker.lastPrice || '0',
          marketCap: 0,
          volume24h: parseFloat(ticker.quoteVolume || 0),
          liquidity: 0,
          change24h: parseFloat(ticker.priceChangePercent || 0),
          ageHours: 0,
          sources: ['mexc_listing'],
          txns: parseInt(ticker.count || 0),
          promoted: false,
          score: 50,
          priority: 'MEDIUM',
          dexUrl: `https://www.mexc.com/exchange/${sym.replace('USDT', '')}_USDT`,
          flags: ['new_listing']
        });
      } catch (e) {
        alerts.push({
          type: 'mexc_listing', symbol: sym.replace('USDT', ''), name: sym.replace('USDT', ''),
          address: sym, price: '0', marketCap: 0, volume24h: 0, liquidity: 0, change24h: 0,
          ageHours: 0, sources: ['mexc_listing'], txns: 0, promoted: false, score: 50,
          priority: 'MEDIUM', dexUrl: `https://www.mexc.com/exchange/${sym.replace('USDT', '')}_USDT`,
          flags: ['new_listing']
        });
      }
    }

    return { alerts, symbols: currentSymbols };
  } catch (e) {
    console.error('MEXC error:', e.message);
    return { alerts, symbols: mexcBaseline };
  }
}

async function fetchVolumeSpikes(watchlist) {
  const alerts = [];
  if (!watchlist || watchlist.length === 0) return alerts;

  for (const coin of watchlist.slice(0, 10)) {
    await delay(300);
    try {
      const addr = coin.address || coin;
      const chain = coin.chain || 'solana';
      const pairs = await fetch(`https://api.dexscreener.com/tokens/v1/${chain}/${addr}`);
      if (!Array.isArray(pairs) || pairs.length === 0) continue;

      const pair = pairs[0];
      const mc = pair.marketCap || pair.fdv || 0;
      const vol = pair.volume?.h24 || 0;
      const volMcRatio = mc > 0 ? vol / mc : 0;

      if (volMcRatio > 0.3 || (coin.avgVolume && vol > coin.avgVolume * 3)) {
        const flags = ['volume_spike'];
        if (volMcRatio > 0.3) flags.push('high_vol_mc_ratio');

        const alert = {
          type: 'volume_spike',
          symbol: pair.baseToken?.symbol || coin.symbol || 'UNKNOWN',
          name: pair.baseToken?.name || coin.name || 'Unknown',
          address: addr,
          price: pair.priceUsd || '0',
          marketCap: mc,
          volume24h: vol,
          liquidity: pair.liquidity?.usd || 0,
          change24h: pair.priceChange?.h24 || 0,
          ageHours: pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / 3600000 : 999,
          sources: ['watchlist_spike'],
          txns: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
          promoted: false,
          dexUrl: pair.url || `https://dexscreener.com/${chain}/${addr}`,
          flags
        };
        alert.score = calcScore(alert);
        alert.priority = priority(alert.score);
        alerts.push(alert);
      }
    } catch (e) {
      console.error(`Watchlist error for ${JSON.stringify(coin).slice(0, 40)}: ${e.message}`);
    }
  }
  return alerts;
}

// --- Cross-Reference ---

function crossReference(allAlerts) {
  const bySymbol = new Map();
  for (const a of allAlerts) {
    const key = a.symbol.toUpperCase();
    if (!bySymbol.has(key)) bySymbol.set(key, []);
    bySymbol.get(key).push(a);
  }

  const result = [];
  for (const [sym, group] of bySymbol) {
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      // Merge: take best alert, combine sources/flags, boost score
      const best = group.sort((a, b) => b.score - a.score)[0];
      const allSources = [...new Set(group.flatMap(a => a.sources))];
      const allFlags = [...new Set(group.flatMap(a => a.flags))];
      allFlags.push('multi_source');

      best.sources = allSources;
      best.flags = allFlags;
      best.score += (group.length - 1) * 20;
      best.priority = priority(best.score);
      result.push(best);
    }
  }
  return result;
}

// --- Main ---

async function main() {
  // Load state
  const state = readJSON(STATE_FILE, { seenTokens: {}, lastRun: null, mexcBaselineCount: 0 });
  const mexcBaseline = readJSON(MEXC_FILE, []);
  const watchlist = readJSON(WATCHLIST_FILE, []);

  // Import old seen tokens from pumpfun monitor
  try {
    const oldSeen = readJSON(SEEN_PUMP_FILE, {});
    for (const [k, v] of Object.entries(oldSeen)) {
      if (!state.seenTokens[k]) state.seenTokens[k] = v;
    }
  } catch {}

  // Expire old seen tokens (7 days)
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 3600 * 1000;
  for (const [k, v] of Object.entries(state.seenTokens)) {
    if (now - v > SEVEN_DAYS) delete state.seenTokens[k];
  }

  // First run detection
  const isFirstRun = mexcBaseline.length === 0 && Object.keys(state.seenTokens).length === 0 && !state.lastRun;

  // Fetch all sources in parallel where possible
  console.error('Fetching pump.fun graduations...');
  const gradAlerts = await fetchPumpGraduations(state.seenTokens);

  console.error('Fetching MEXC listings...');
  const { alerts: mexcAlerts, symbols: newMexcSymbols } = await fetchMexcListings(mexcBaseline);

  console.error('Checking volume spikes...');
  const spikeAlerts = await fetchVolumeSpikes(watchlist);

  // Combine and cross-reference
  const allAlerts = [...gradAlerts, ...mexcAlerts, ...spikeAlerts];
  const finalAlerts = crossReference(allAlerts);

  // Sort by score descending
  finalAlerts.sort((a, b) => b.score - a.score);

  // Mark as seen
  for (const a of finalAlerts) {
    if (a.address) state.seenTokens[a.address] = now;
  }

  // Save state
  state.lastRun = new Date().toISOString();
  state.mexcBaselineCount = newMexcSymbols.length;
  writeJSON(STATE_FILE, state);
  writeJSON(MEXC_FILE, newMexcSymbols.length > 0 ? newMexcSymbols : mexcBaseline);
  if (!fs.existsSync(WATCHLIST_FILE)) writeJSON(WATCHLIST_FILE, []);

  // Output
  if (isFirstRun && finalAlerts.length === 0) {
    console.log(JSON.stringify({ firstRun: true, timestamp: new Date().toISOString(), mexcSymbols: newMexcSymbols.length }));
  } else {
    // Clean up internal fields
    const cleaned = finalAlerts.map(a => {
      const { txns, promoted, ...rest } = a;
      return rest;
    });
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), alerts: cleaned, stats: { graduations: gradAlerts.length, mexcNew: mexcAlerts.length, volumeSpikes: spikeAlerts.length, total: finalAlerts.length } }, null, 2));
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
