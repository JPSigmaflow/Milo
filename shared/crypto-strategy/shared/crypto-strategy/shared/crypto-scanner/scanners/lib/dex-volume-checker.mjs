#!/usr/bin/env node
/**
 * DEX Volume Checker
 * 
 * Checks real-time trading volume on Raydium/Jupiter for Pump.fun tokens.
 * High volume = market interest = higher chance of CEX listing.
 */

import https from 'https';

/**
 * Check Raydium volume for a token
 * @param {string} mint - Token mint address
 * @returns {Promise<{volume24h: number, trades24h: number, priceChange24h: number}>}
 */
export async function checkRaydiumVolume(mint) {
  return new Promise((resolve) => {
    // Raydium API endpoint
    const url = `https://api.raydium.io/v2/main/pairs`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CryptoScanner/1.0)'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          // Find pair with matching mint
          const pair = json.find(p => 
            p.baseMint === mint || p.quoteMint === mint
          );
          
          if (pair) {
            resolve({
              volume24h: parseFloat(pair.volume24h || 0),
              trades24h: parseInt(pair.trades24h || 0),
              priceChange24h: parseFloat(pair.priceChange24h || 0)
            });
          } else {
            resolve({ volume24h: 0, trades24h: 0, priceChange24h: 0 });
          }
        } catch {
          resolve({ volume24h: 0, trades24h: 0, priceChange24h: 0 });
        }
      });
    }).on('error', () => {
      resolve({ volume24h: 0, trades24h: 0, priceChange24h: 0 });
    });
  });
}

/**
 * Check Jupiter aggregated volume
 */
export async function checkJupiterVolume(mint) {
  return new Promise((resolve) => {
    const url = `https://price.jup.ag/v4/price?ids=${mint}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CryptoScanner/1.0)'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const tokenData = json.data?.[mint];
          
          if (tokenData) {
            resolve({
              price: parseFloat(tokenData.price || 0),
              volume24h: parseFloat(tokenData.volume24h || 0)
            });
          } else {
            resolve({ price: 0, volume24h: 0 });
          }
        } catch {
          resolve({ price: 0, volume24h: 0 });
        }
      });
    }).on('error', () => {
      resolve({ price: 0, volume24h: 0 });
    });
  });
}

/**
 * Get comprehensive DEX metrics
 */
export async function getDEXMetrics(mint) {
  const [raydium, jupiter] = await Promise.all([
    checkRaydiumVolume(mint),
    checkJupiterVolume(mint)
  ]);
  
  return {
    totalVolume24h: raydium.volume24h + jupiter.volume24h,
    trades24h: raydium.trades24h,
    priceChange24h: raydium.priceChange24h,
    hasSignificantVolume: (raydium.volume24h + jupiter.volume24h) > 10000, // >$10K
    hasActiveTrading: raydium.trades24h > 100
  };
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mint = process.argv[2] || 'So11111111111111111111111111111111111111112'; // SOL
  console.log(`Checking DEX volume for: ${mint}`);
  
  getDEXMetrics(mint).then(result => {
    console.log('Result:', result);
    console.log(`24h Volume: $${result.totalVolume24h.toLocaleString()}`);
    console.log(`Trades: ${result.trades24h}`);
  });
}
