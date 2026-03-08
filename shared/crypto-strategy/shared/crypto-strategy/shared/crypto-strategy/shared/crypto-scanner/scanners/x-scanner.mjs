import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const COOKIES_FILE = join(ROOT, 'x-cookies.json');

// Crypto search queries for the scanner
const QUERIES = [
  'solana memecoin pump',
  'viral crypto token launch',
  'whale alert crypto',
  'memecoin 100x gem',
  'dexscreener trending solana',
];

// KOL profiles to monitor — ONLY verified real accounts
const KOLS = [
  // On-chain trackers
  'lookonchain', 'whale_alert', 'ZachXBT', 'EmberCN', 'ai_9684xtpa', 'Spot_On_Chain',
  // Traders & analysts
  'MustStopMurad', 'blknoiz06', 'crashiusclay69', 'HsakaTrades', 'CryptoKaleo',
  'AltcoinSherpa', 'SmartContracter', 'ColdBloodShill', 'Pentoshi', 'DonAlt',
  'CryptoTony__', 'DaanCrypto', 'KoroushAK', 'lightcrypto', 'milesdeutscher',
  'Route2FI', 'TheDeFiEdge', 'DefiIgnas', 'ThinkingUSD',
  // Solana focused
  'rajgokal', '0xMert_', 'SolJakey', 'SolanaBuckets', 'aixbt_agent',
  // News & media
  'WatcherGuru', 'CoinDesk', 'Cointelegraph', 'theblock__', 'decrypt_co',
  'AltcoinDailyio', 'CryptoRank_io', 'BTC_Archive', 'DocumentingBTC', 'BitcoinMagazine',
  // Builders & VCs
  'VitalikButerin', 'cdixon', 'WuBlockchain', '0xJeff_', 'cobie',
];

function getCookies() {
  const data = JSON.parse(readFileSync(COOKIES_FILE, 'utf8'));
  return [
    { name: 'auth_token', value: data.auth_token, domain: '.x.com', path: '/', httpOnly: true, secure: true },
    { name: 'ct0', value: data.ct0, domain: '.x.com', path: '/', secure: true },
  ];
}

async function createContext() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  });
  await ctx.addCookies(getCookies());
  return { browser, ctx };
}

async function searchTweets(page, query) {
  await page.goto(`https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`, { 
    timeout: 15000, waitUntil: 'domcontentloaded' 
  });
  await page.waitForTimeout(4000);
  
  return page.evaluate(() => {
    const tweets = [];
    const els = document.querySelectorAll('[data-testid="tweetText"]');
    const users = document.querySelectorAll('[data-testid="User-Name"]');
    els.forEach((el, i) => {
      const username = users[i]?.querySelector('a[tabindex="-1"]')?.textContent || '?';
      tweets.push({ text: el.innerText, user: username });
    });
    return tweets.slice(0, 10);
  });
}

async function getKolTweets(page, handle) {
  await page.goto(`https://x.com/${handle}`, { timeout: 15000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  return page.evaluate(() => {
    const els = document.querySelectorAll('[data-testid="tweetText"]');
    return Array.from(els).slice(0, 5).map(el => el.innerText);
  });
}

export async function scanX() {
  const seenFile = join(ROOT, 'data', 'seen-x.json');
  const seen = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : { hashes: [] };
  const seenSet = new Set(seen.hashes);
  const results = [];

  const { browser, ctx } = await createContext();
  const page = await ctx.newPage();

  try {
    // Search queries
    for (const q of QUERIES) {
      try {
        const tweets = await searchTweets(page, q);
        for (const t of tweets) {
          const hash = t.text.substring(0, 80);
          if (seenSet.has(hash)) continue;
          seenSet.add(hash);
          results.push({ source: `x-search`, query: q, user: t.user, text: t.text, time: new Date().toISOString() });
        }
        console.log(`[X] "${q}": ${tweets.length} tweets`);
      } catch(e) { console.log(`[X] "${q}": error`); }
      await page.waitForTimeout(2000);
    }

    // KOL monitoring
    for (const handle of KOLS) {
      try {
        const tweets = await getKolTweets(page, handle);
        for (const t of tweets) {
          const hash = t.substring(0, 80);
          if (seenSet.has(hash)) continue;
          seenSet.add(hash);
          results.push({ source: `x-kol`, handle, text: t, time: new Date().toISOString() });
        }
        console.log(`[X] @${handle}: ${tweets.length} tweets`);
      } catch(e) { console.log(`[X] @${handle}: error`); }
      await page.waitForTimeout(2000);
    }
  } finally {
    await browser.close();
  }

  // Update seen
  seen.hashes = [...seenSet].slice(-10000);
  writeFileSync(seenFile, JSON.stringify(seen));

  console.log(`[X] Total: ${results.length} new items`);
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await scanX();
  r.slice(0, 10).forEach(t => console.log(`  [${t.source}] ${t.user||t.handle}: ${t.text?.substring(0, 120)}`));
}
