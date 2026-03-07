import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load KOL accounts from config.json (single source of truth)
const configPath = join(ROOT, 'config.json');
const configData = JSON.parse(readFileSync(configPath, 'utf8'));
const KOLS = configData.x?.accounts || [];

// Crypto keywords for tweets WITHOUT $TICKER
const CRYPTO_KEYWORDS = [
  'crypto', 'token', 'coin', 'defi', 'dex', 'nft', 'web3', 'blockchain', 'onchain', 'on-chain',
  'airdrop', 'launch', 'listing', 'mint', 'stake', 'staking', 'yield', 'farm', 'swap',
  'bullish', 'bearish', 'pump', 'dump', 'moon', 'rug', 'whale', 'alpha', 'gem',
  'mainnet', 'testnet', 'tvl', 'liquidity', 'mcap', 'market cap', 'fdv',
  'solana', 'ethereum', 'bitcoin', 'base', 'arbitrum', 'polygon', 'avalanche', 'cosmos',
  'ai agent', 'ai agents', 'depin', 'rwa', 'restaking', 'meme', 'memecoin',
  'contract address', 'ca:', '0x', 'sol:', 'buy', 'sell', 'ape', 'aped',
  'binance', 'coinbase', 'mexc', 'okx', 'bybit', 'kucoin', 'raydium', 'jupiter', 'uniswap',
  'smart money', 'degen', 'bags', 'portfolio', 'trade', 'trading',
  'pump.fun', 'pumpfun', 'dexscreener', 'coingecko', 'coinmarketcap',
  'protocol', 'dao', 'governance', 'vault', 'bridge', 'layer', 'l1', 'l2', 'zk',
  'fhe', 'mpc', 'privacy', 'modular', 'rollup', 'appchain',
];

function extractTweetsWithEngagement(html) {
  const tweets = [];
  
  // Try to parse full tweet objects from JSON
  // Syndication embeds tweet data as JSON - extract more fields
  const fullTextMatches = html.matchAll(/"full_text":"((?:[^"\\]|\\.)*)"/g);
  const texts = [];
  for (const m of fullTextMatches) {
    const text = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    if (text.length > 20 && !texts.includes(text)) {
      texts.push(text);
    }
  }

  // Extract engagement data near each tweet
  // Pattern: favorite_count, retweet_count, reply_count appear near full_text in JSON
  const favMatches = [...html.matchAll(/"favorite_count":(\d+)/g)].map(m => parseInt(m[1]));
  const rtMatches = [...html.matchAll(/"retweet_count":(\d+)/g)].map(m => parseInt(m[1]));
  const replyMatches = [...html.matchAll(/"reply_count":(\d+)/g)].map(m => parseInt(m[1]));

  for (let i = 0; i < texts.length && i < 10; i++) {
    tweets.push({
      text: texts[i],
      likes: favMatches[i] || 0,
      retweets: rtMatches[i] || 0,
      replies: replyMatches[i] || 0,
    });
  }

  return tweets;
}

function hasCryptoRelevance(text) {
  const lower = text.toLowerCase();
  let matchCount = 0;
  for (const kw of CRYPTO_KEYWORDS) {
    if (lower.includes(kw)) {
      matchCount++;
      if (matchCount >= 1) return true; // At least 1 crypto keyword
    }
  }
  return false;
}

export async function scanX() {
  const seenFile = join(ROOT, 'data', 'seen-x.json');
  const seen = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : { hashes: [] };
  const seenSet = new Set(seen.hashes);
  const results = [];

  for (const handle of KOLS) {
    try {
      const raw = execSync(
        `curl -sL --max-time 10 "https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}" -H "User-Agent: Mozilla/5.0"`,
        { timeout: 15000, maxBuffer: 2 * 1024 * 1024 }
      ).toString();

      const tweets = extractTweetsWithEngagement(raw);
      let newCount = 0;
      for (const tw of tweets) {
        const hash = tw.text.substring(0, 100);
        if (seenSet.has(hash)) continue;
        seenSet.add(hash);
        newCount++;
        
        // Extract $TICKER mentions
        const tickers = [...tw.text.matchAll(/\$([A-Z]{2,10})\b/g)].map(m => m[1]);
        
        // FIX #1: Also keep tweets WITHOUT $TICKER if they have crypto relevance
        const hasTickers = tickers.length > 0;
        const cryptoRelevant = hasCryptoRelevance(tw.text);
        
        // FIX #2: Flag viral tweets (high engagement)
        const engagement = tw.likes + tw.retweets * 2 + tw.replies * 3;
        const isViral = tw.likes >= 500 || tw.retweets >= 100 || tw.replies >= 50;
        
        if (hasTickers || cryptoRelevant || isViral) {
          results.push({ 
            source: 'x-syndication', 
            handle, 
            text: tw.text, 
            tickers,
            likes: tw.likes,
            retweets: tw.retweets,
            replies: tw.replies,
            engagement,
            isViral,
            hasTicker: hasTickers,
            cryptoKeywordMatch: !hasTickers && cryptoRelevant,
            time: new Date().toISOString() 
          });
        }
      }
      if (newCount > 0) console.log(`[X] @${handle}: ${tweets.length} tweets, ${newCount} new`);
    } catch(e) {
      console.log(`[X] @${handle}: error - ${e.message?.substring(0, 50)}`);
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 1500));
  }

  seen.hashes = [...seenSet].slice(-20000);
  writeFileSync(seenFile, JSON.stringify(seen));
  console.log(`[X] Total: ${results.length} new tweets from ${KOLS.length} accounts (ticker: ${results.filter(r=>r.hasTicker).length}, keyword: ${results.filter(r=>r.cryptoKeywordMatch).length}, viral: ${results.filter(r=>r.isViral).length})`);
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await scanX();
  r.slice(0, 5).forEach(t => console.log(`  @${t.handle} [❤️${t.likes} 🔁${t.retweets} 💬${t.replies}]: ${t.text?.substring(0, 100)}`));
}
