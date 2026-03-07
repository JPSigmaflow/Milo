#!/usr/bin/env node
/**
 * Pump.fun Scanner — Findet virale Memecoins auf Solana
 * 
 * Datenquellen:
 * 1. DexScreener API — neue/trending Solana Pairs
 * 2. DexScreener Boosted Tokens — bezahlte Promotion (Signal)
 * 3. DexScreener Token Profiles — neue Listings
 * 
 * Output: pumpfun-candidates.json für AI-Analyse im Cron-Job
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CANDIDATES_FILE = join(ROOT, 'data', 'pumpfun-candidates.json');
const SEEN_FILE = join(ROOT, 'data', 'pumpfun-seen.json');

// --- Config ---
const MIN_LIQUIDITY = 5000;      // Min $5K liquidity
const ULTRA_EARLY_MC = 500000;   // Ultra-early threshold: <$500K
const MOMENTUM_MC = 5000000;     // Momentum plays: $500K-$5M
const MIN_AGE_MINUTES = 10;      // Skip tokens < 10min old (too early)
const MAX_AGE_HOURS = 72;        // Skip tokens > 72h old (too late)

// --- Helpers ---
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadSeen() {
  if (!existsSync(SEEN_FILE)) return {};
  try { return JSON.parse(readFileSync(SEEN_FILE, 'utf8')); } catch { return {}; }
}

function saveSeen(seen) {
  writeFileSync(SEEN_FILE, JSON.stringify(seen, null, 2));
}

// --- DexScreener API ---
async function fetchNewSolanaPairs() {
  // Search for pump.fun graduated tokens on Solana
  const queries = ['pump.fun solana', 'new solana meme'];
  const pairs = [];
  
  for (const q of queries) {
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.pairs) pairs.push(...data.pairs);
      await sleep(1200); // Rate limit: 60/min
    } catch (e) {
      console.error(`Search error for "${q}":`, e.message);
    }
  }
  return pairs;
}

async function fetchBoostedTokens() {
  try {
    const res = await fetch('https://api.dexscreener.com/token-boosts/latest/v1');
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).filter(t => t.chainId === 'solana');
  } catch (e) {
    console.error('Boosted fetch error:', e.message);
    return [];
  }
}

async function fetchTokenProfiles() {
  try {
    const res = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).filter(t => t.chainId === 'solana');
  } catch (e) {
    console.error('Profiles fetch error:', e.message);
    return [];
  }
}

async function fetchTokenDetails(chainId, tokenAddress) {
  try {
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/${chainId}/${tokenAddress}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// --- Filter & Score ---
function isPumpFunToken(pair) {
  // Pump.fun graduated tokens typically have specific DEX patterns
  const labels = pair.labels || [];
  const dexId = pair.dexId || '';
  const url = pair.url || '';
  
  return labels.includes('pump.fun') || 
         dexId === 'raydium' || // pump.fun graduates to Raydium
         url.includes('pump') ||
         (pair.pairCreatedAt && pair.chainId === 'solana');
}

function filterCandidate(pair) {
  if (pair.chainId !== 'solana') return false;
  
  const mc = pair.marketCap || pair.fdv || 0;
  const liq = pair.liquidity?.usd || 0;
  const ageMs = Date.now() - (pair.pairCreatedAt || 0);
  const ageMinutes = ageMs / 60000;
  const ageHours = ageMs / 3600000;
  
  // Two-tier MC filter
  if (mc > MOMENTUM_MC) return false;  // Max $5M
  if (liq < MIN_LIQUIDITY) return false;
  if (ageMinutes < MIN_AGE_MINUTES) return false;
  if (ageHours > MAX_AGE_HOURS) return false;
  
  return true;
}

function buildCandidate(pair, source) {
  const mc = pair.marketCap || pair.fdv || 0;
  const liq = pair.liquidity?.usd || 0;
  const vol24 = pair.volume?.h24 || 0;
  const priceChange = pair.priceChange?.h24 || 0;
  const txns24 = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
  const ageHours = (Date.now() - (pair.pairCreatedAt || 0)) / 3600000;
  
  // Determine category
  let category = 'momentum';
  let alertThreshold = 10;
  if (mc < ULTRA_EARLY_MC) {
    category = 'ultra_early';
    alertThreshold = 8;
  }
  
  return {
    token: pair.baseToken?.symbol || 'UNKNOWN',
    name: pair.baseToken?.name || '',
    address: pair.baseToken?.address || '',
    pairAddress: pair.pairAddress || '',
    dexId: pair.dexId || '',
    mc: Math.round(mc),
    liquidity: Math.round(liq),
    volume24h: Math.round(vol24),
    priceUsd: pair.priceUsd || '0',
    priceChange24h: priceChange,
    txns24h: txns24,
    ageHours: Math.round(ageHours * 10) / 10,
    category,  // NEW: ultra_early or momentum
    alertThreshold,  // NEW: 8 for ultra_early, 10 for momentum
    url: pair.url || `https://dexscreener.com/solana/${pair.baseToken?.address}`,
    labels: pair.labels || [],
    source,
    scannedAt: new Date().toISOString(),
    // On-chain signals (for AI analysis)
    signals: {
      highVolToMc: vol24 > mc * 2, // Volume > 2x MC = high activity
      goodLiquidity: liq > mc * 0.1, // Liq > 10% MC
      freshToken: ageHours < 24,
      microCap: mc < 100000,
      strongMomentum: priceChange > 50,
      activeTrading: txns24 > 500,
    }
  };
}

// --- Main ---
async function main() {
  console.log(`[${new Date().toISOString()}] Pump.fun Scanner starting...`);
  
  const seen = loadSeen();
  const candidates = [];
  
  // 1. Fetch new pairs from search
  console.log('Fetching new Solana pairs...');
  const pairs = await fetchNewSolanaPairs();
  console.log(`Found ${pairs.length} pairs from search`);
  
  // 2. Fetch boosted tokens (paid promotion = signal)
  await sleep(1200);
  console.log('Fetching boosted tokens...');
  const boosted = await fetchBoostedTokens();
  console.log(`Found ${boosted.length} boosted Solana tokens`);
  
  // 3. Fetch new token profiles
  await sleep(1200);
  console.log('Fetching token profiles...');
  const profiles = await fetchTokenProfiles();
  console.log(`Found ${profiles.length} Solana token profiles`);
  
  // Process pairs
  for (const pair of pairs) {
    if (!filterCandidate(pair)) continue;
    const addr = pair.baseToken?.address;
    if (!addr || seen[addr]) continue;
    
    candidates.push(buildCandidate(pair, 'search'));
    seen[addr] = Date.now();
  }
  
  // Process boosted tokens — fetch top 5 unseen only (rate limit)
  let boostedChecked = 0;
  for (const token of boosted) {
    if (seen[token.tokenAddress] || boostedChecked >= 5) continue;
    boostedChecked++;
    await sleep(1200);
    const details = await fetchTokenDetails('solana', token.tokenAddress);
    if (!details || !Array.isArray(details) || details.length === 0) continue;
    
    const pair = details[0];
    if (!filterCandidate(pair)) continue;
    
    candidates.push(buildCandidate(pair, 'boosted'));
    seen[token.tokenAddress] = Date.now();
  }
  
  // Clean old seen entries (> 7 days)
  const weekAgo = Date.now() - 7 * 24 * 3600000;
  for (const [addr, ts] of Object.entries(seen)) {
    if (ts < weekAgo) delete seen[addr];
  }
  
  saveSeen(seen);
  
  // Save candidates
  const existing = existsSync(CANDIDATES_FILE) 
    ? JSON.parse(readFileSync(CANDIDATES_FILE, 'utf8')) 
    : [];
  
  const merged = [...candidates, ...existing].slice(0, 100); // Keep last 100
  writeFileSync(CANDIDATES_FILE, JSON.stringify(merged, null, 2));
  
  console.log(`\n✅ ${candidates.length} new candidates found`);
  candidates.forEach(c => {
    console.log(`  ${c.token} (${c.name}) — MC: $${c.mc.toLocaleString()}, Vol: $${c.volume24h.toLocaleString()}, Age: ${c.ageHours}h`);
  });
  
  // Output summary for cron consumption
  if (candidates.length > 0) {
    console.log('\n--- CANDIDATES_JSON ---');
    console.log(JSON.stringify(candidates));
    console.log('--- END_CANDIDATES ---');
  }
}

main().catch(e => { console.error('Scanner error:', e); process.exit(1); });
