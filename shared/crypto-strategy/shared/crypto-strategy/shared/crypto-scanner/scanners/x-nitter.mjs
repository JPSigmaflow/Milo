// X/Twitter Scanner via Nitter (no API, no login, free)
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const NITTER = 'https://nitter.tiekoetter.com';

const CRYPTO_KOLS = [
  'lookonchain', 'whale_alert', 'MustStopMurad', 'CryptoKaleo',
  'blknoiz06', 'DegenSpartan', 'inversebrah', 'CryptoGodJohn',
  'AltcoinSherpa', 'TheCryptoDog', 'Rewkang', 'HsakaTrades',
  'ColdBloodShill', 'AngeloBTC', 'SmartContracter', 'CryptoCapo_',
  'ZachXBT', 'cobie', 'GCRClassic', 'SBF_FTX',
  // Meme/viral accounts
  'cb_doge', 'elikitten_sol', 'pumaboradotfun',
];

async function fetchProfile(handle) {
  try {
    const r = await fetch(`${NITTER}/${handle}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return [];
    const html = await r.text();
    
    // Extract tweets
    const tweetRegex = /class="tweet-content[^"]*"[^>]*>(.*?)<\/div>/gs;
    const tweets = [];
    let m;
    while ((m = tweetRegex.exec(html)) !== null) {
      const clean = m[1].replace(/<[^>]+>/g, '').trim();
      if (clean.length > 20) tweets.push(clean);
    }
    return tweets.slice(0, 5);
  } catch(e) {
    return [];
  }
}

export async function scanX() {
  console.log(`[X] Scanning ${CRYPTO_KOLS.length} profiles via Nitter...`);
  const results = [];
  const seenFile = join(ROOT, 'data', 'seen-x.json');
  const seen = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : { tweets: [] };
  const seenSet = new Set(seen.tweets);
  
  // Scan in batches of 5 (be nice to Nitter)
  for (let i = 0; i < CRYPTO_KOLS.length; i += 5) {
    const batch = CRYPTO_KOLS.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(async handle => {
      const tweets = await fetchProfile(handle);
      const newTweets = tweets.filter(t => !seenSet.has(t.substring(0, 80)));
      if (newTweets.length > 0) {
        console.log(`[X] @${handle}: ${newTweets.length} new tweets`);
      }
      return newTweets.map(t => ({
        source: `x-${handle}`,
        text: t,
        handle,
        time: new Date().toISOString()
      }));
    }));
    
    for (const br of batchResults) results.push(...br);
    // Small delay between batches
    if (i + 5 < CRYPTO_KOLS.length) await new Promise(r => setTimeout(r, 2000));
  }
  
  // Update seen
  for (const r of results) {
    seenSet.add(r.text.substring(0, 80));
  }
  seen.tweets = [...seenSet].slice(-5000); // Keep last 5000
  writeFileSync(seenFile, JSON.stringify(seen));
  
  console.log(`[X] Total: ${results.length} new tweets from ${CRYPTO_KOLS.length} profiles`);
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await scanX();
  r.slice(0, 10).forEach(t => console.log(`  [@${t.handle}] ${t.text.substring(0, 120)}`));
}
