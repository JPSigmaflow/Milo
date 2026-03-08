#!/usr/bin/env node
/**
 * DexScreener API Client — Batch fetcher with retry & rate limiting
 */

import https from 'https';

const BASE_URL = 'https://api.dexscreener.com';
const MAX_BATCH = 30; // DexScreener limit per request
const RETRY_MAX = 3;
const RETRY_BASE_MS = 1000;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 429) {
          reject(new Error('RATE_LIMITED'));
        } else if (res.statusCode === 200) {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('JSON_PARSE_ERROR')); }
        } else {
          reject(new Error(`HTTP_${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch token data with retries and exponential backoff
 */
async function fetchWithRetry(url, attempt = 0) {
  try {
    return await fetchJson(url);
  } catch (err) {
    if (attempt >= RETRY_MAX) throw err;
    const delay = err.message === 'RATE_LIMITED' 
      ? 60000  // 60s for rate limit
      : RETRY_BASE_MS * Math.pow(2, attempt);
    console.warn(`⚠️ ${err.message}, retry ${attempt + 1}/${RETRY_MAX} in ${delay}ms`);
    await sleep(delay);
    return fetchWithRetry(url, attempt + 1);
  }
}

/**
 * Batch fetch token data from DexScreener
 * @param {string[]} addresses - Token contract addresses
 * @returns {Map<string, object>} address → pair data (best pair by liquidity)
 */
export async function batchFetchTokens(addresses) {
  const results = new Map();
  const batches = [];
  
  for (let i = 0; i < addresses.length; i += MAX_BATCH) {
    batches.push(addresses.slice(i, i + MAX_BATCH));
  }

  for (const batch of batches) {
    const url = `${BASE_URL}/tokens/v1/solana/${batch.join(',')}`;
    try {
      const data = await fetchWithRetry(url);
      
      // DexScreener returns array of pairs
      const pairs = Array.isArray(data) ? data : (data.pairs || []);
      
      for (const pair of pairs) {
        const addr = pair.baseToken?.address;
        if (!addr) continue;
        
        const addrLower = addr.toLowerCase();
        const existing = results.get(addrLower);
        
        // Keep pair with highest liquidity
        if (!existing || (pair.liquidity?.usd || 0) > (existing.liquidity?.usd || 0)) {
          results.set(addrLower, pair);
        }
      }
      
      // Small delay between batches
      if (batches.length > 1) await sleep(500);
    } catch (err) {
      console.error(`❌ Batch fetch failed: ${err.message}`);
      // Continue with next batch
    }
  }

  return results;
}

/**
 * Normalize DexScreener pair data to our snapshot format
 */
export function normalizePair(pair) {
  return {
    priceUsd: parseFloat(pair.priceUsd) || null,
    marketCap: pair.marketCap || pair.mcap || null,
    fdv: pair.fdv || null,
    liquidity: pair.liquidity?.usd || null,
    volume24h: pair.volume?.h24 || null,
    txnsBuys: pair.txns?.h24?.buys || null,
    txnsSells: pair.txns?.h24?.sells || null,
    raw: {
      pairAddress: pair.pairAddress,
      dexId: pair.dexId,
      priceChange: pair.priceChange,
      url: pair.url
    }
  };
}

/**
 * Detect volume/price spikes for hot-mode
 */
export function detectSpike(currentData, previousSnapshot) {
  if (!previousSnapshot || !currentData.volume24h) return false;
  
  const volumeSpike = previousSnapshot.volume_24h > 0 
    ? currentData.volume24h / previousSnapshot.volume_24h > 3
    : false;
  
  const priceChange = previousSnapshot.price_usd > 0
    ? Math.abs((currentData.priceUsd - previousSnapshot.price_usd) / previousSnapshot.price_usd) > 0.5
    : false;
  
  return volumeSpike || priceChange;
}

// CLI test
if (process.argv[2] === 'test') {
  const testAddr = process.argv[3] || 'BKwSZd5tUFC1SudnHbhjmqJ6Nk8n5vz1wVphb7Mupump';
  console.log(`Testing fetch for ${testAddr}...`);
  const results = await batchFetchTokens([testAddr]);
  for (const [addr, pair] of results) {
    console.log(`\n${pair.baseToken?.name} (${pair.baseToken?.symbol})`);
    console.log(normalizePair(pair));
  }
}
