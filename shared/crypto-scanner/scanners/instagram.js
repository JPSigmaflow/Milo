import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const config = JSON.parse(readFileSync(join(ROOT, 'config.json'), 'utf8'));

const CRYPTO_KEYWORDS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain', 'defi',
  'nft', 'altcoin', 'trading', 'hodl', 'bullish', 'bearish', 'pump',
  'token', 'airdrop', 'solana', 'sol', 'cardano', 'ada', 'xrp',
  'binance', 'coinbase', 'dex', 'swap', 'yield', 'staking', 'mining',
  'memecoin', 'doge', 'shib', 'pepe', 'web3', 'metaverse', 'whale',
  'liquidation', 'leverage', 'futures', 'spot', 'market cap', 'ath',
  'portfolio', 'bull run', 'bear market', 'halving', 'layer 2', 'l2',
  'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'cosmos',
  'polkadot', 'chainlink', 'uniswap', 'wallet', 'ledger', 'seed phrase',
];

const IG_API_URL = 'https://www.instagram.com/api/v1/users/web_profile_info/';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const APP_ID = '936619743392459';

function fetchProfile(username) {
  try {
    const raw = execSync(
      `curl -sL "${IG_API_URL}?username=${username}" ` +
      `-H "User-Agent: ${USER_AGENT}" ` +
      `-H "X-IG-App-ID: ${APP_ID}"`,
      { timeout: 15000 }
    ).toString();
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function matchesCrypto(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return CRYPTO_KEYWORDS.some(kw => lower.includes(kw));
}

export async function scanIg() {
  const accounts = config.instagram?.accounts || [];
  if (!accounts.length) return [];

  const seenFile = join(ROOT, 'data', 'seen.json');
  const seen = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : {};
  const seenSet = new Set(seen.igPosts || []);
  const results = [];

  for (const handle of accounts) {
    try {
      const data = fetchProfile(handle);
      if (!data?.data?.user) continue;

      const user = data.data.user;
      const edges = user.edge_owner_to_timeline_media?.edges || [];

      for (const edge of edges) {
        const node = edge.node;
        const postId = node.shortcode || node.id;

        if (seenSet.has(postId)) continue;

        const captions = node.edge_media_to_caption?.edges || [];
        const text = captions[0]?.node?.text || '';

        // Filter for crypto content (skip for known crypto-only accounts)
        const isKnownCrypto = config.instagram?.knownCryptoAccounts?.includes(handle);
        if (!isKnownCrypto && !matchesCrypto(text)) continue;

        const likes = node.edge_liked_by?.count
          ?? node.edge_media_preview_like?.count
          ?? 0;
        const comments = node.edge_media_to_comment?.count ?? 0;
        const timestamp = node.taken_at_timestamp;

        results.push({
          source: 'instagram',
          handle,
          text: text.slice(0, 500),
          likes,
          comments,
          time: timestamp ? new Date(timestamp * 1000).toISOString() : null,
          postId,
          url: `https://www.instagram.com/p/${postId}/`,
        });

        seenSet.add(postId);
      }

      // Throttle: 500ms between accounts to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error(`[IG] Error scanning @${handle}:`, e.message);
    }
  }

  // Persist seen posts
  seen.igPosts = [...seenSet].slice(-5000); // Keep last 5000
  writeFileSync(seenFile, JSON.stringify(seen, null, 2));

  return results;
}
