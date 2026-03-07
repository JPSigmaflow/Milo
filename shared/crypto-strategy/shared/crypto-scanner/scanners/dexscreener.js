import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const loadJSON = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
const saveJSON = (f, d) => writeFileSync(join(ROOT, f), JSON.stringify(d, null, 2));

const config = loadJSON('config.json');

// FIX #5: Multi-Chain support
const CHAINS = ['solana', 'ethereum', 'base', 'arbitrum', 'avalanche', 'bsc'];

export async function scanDexScreener() {
  const seen = loadJSON('data/seen.json');
  const seenSet = new Set(seen.dexPairs);
  const results = [];

  // 1. Boosted tokens (all chains)
  console.log('[Dex] Fetching boosted tokens (multi-chain)...');
  try {
    const res = await fetch('https://api.dexscreener.com/token-boosts/latest/v1');
    if (res.ok) {
      const boosts = await res.json();
      // FIX #5: Filter for all supported chains, not just Solana
      const filteredBoosts = (Array.isArray(boosts) ? boosts : []).filter(b => CHAINS.includes(b.chainId));
      console.log(`[Dex] ${filteredBoosts.length} boosted tokens across ${CHAINS.join(', ')}`);
      
      for (const b of filteredBoosts.slice(0, 30)) {
        if (seenSet.has(b.tokenAddress)) continue;
        try {
          const pRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${b.tokenAddress}`);
          if (!pRes.ok) continue;
          const pData = await pRes.json();
          const pairs = pData?.pairs || [];
          const bestPair = pairs.find(p => CHAINS.includes(p.chainId)) || pairs[0];
          if (!bestPair) continue;
          
          const liq = bestPair.liquidity?.usd || 0;
          const mc = bestPair.marketCap || bestPair.fdv || 0;
          const ageH = bestPair.pairCreatedAt ? (Date.now() - bestPair.pairCreatedAt) / 3600000 : 999;
          const priceChange24h = bestPair.priceChange?.h24 || 0;
          const vol24h = bestPair.volume?.h24 || 0;
          
          if (liq < (config.dex?.minLiquidity || 10000)) continue;
          if (ageH > (config.dex?.maxAgeHours || 24)) continue;
          
          results.push({
            address: b.tokenAddress,
            name: bestPair.baseToken?.name || b.name || 'Unknown',
            symbol: bestPair.baseToken?.symbol || b.symbol || '???',
            chain: bestPair.chainId,
            pairAddress: bestPair.pairAddress,
            liquidity: liq,
            marketCap: mc,
            volume24h: vol24h,
            priceChange24h,
            ageHours: Math.round(ageH * 10) / 10,
            url: bestPair.url || `https://dexscreener.com/${bestPair.chainId}/${bestPair.pairAddress}`,
            boosted: true,
            scannedAt: new Date().toISOString()
          });
          seenSet.add(b.tokenAddress);
        } catch (e) {
          // skip
        }
        await new Promise(r => setTimeout(r, 300));
      }
    }
  } catch (e) {
    console.log(`[Dex] Boost error: ${e.message}`);
  }

  seen.dexPairs = [...seenSet].slice(-5000);
  saveJSON('data/seen.json', seen);
  
  console.log(`[Dex] Found ${results.length} new tokens across ${CHAINS.length} chains`);
  results.slice(0, 5).forEach(t => 
    console.log(`  🪙 ${t.symbol} (${t.chain}) | MC: $${(t.marketCap/1000).toFixed(0)}k | LP: $${(t.liquidity/1000).toFixed(0)}k | ${t.priceChange24h > 0 ? '+' : ''}${t.priceChange24h}% 24h`)
  );
  
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scanDexScreener().then(r => console.log(`\n[Dex] Total: ${r.length} new tokens`));
}
