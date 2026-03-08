import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const COOKIES_FILE = join(ROOT, 'x-cookies.json');
const CONFIG_FILE = join(ROOT, 'config.json');
const OUTPUT_FILE = join(ROOT, 'data', 'x-scanner-output.json');

// Load full KOL list from config
const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
const ALL_KOLS = config.x.accounts; // All 1,137 KOLs

// Top-tier KOLs (always scan these)
const PRIORITY_KOLS = [
  'lookonchain', 'whale_alert', 'ZachXBT', 'EmberCN', 'ai_9684xtpa',
  'MustStopMurad', 'blknoiz06', 'HsakaTrades', 'CryptoKaleo', 'Pentoshi',
  'rajgokal', '0xMert_', 'SolJakey', 'aixbt_agent', 'milesdeutscher',
  'WatcherGuru', 'woonomic', 'CryptoDonAlt', 'CryptoMichNL'
];

// Crypto search queries
const QUERIES = [
  'solana memecoin pump',
  'viral crypto token launch',
  'whale alert crypto',
  'memecoin 100x gem',
  'dexscreener trending solana',
  'ai agent crypto',
  'base chain new token'
];

function getCookies() {
  if (!existsSync(COOKIES_FILE)) {
    throw new Error('x-cookies.json not found! Need auth_token and ct0.');
  }
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

async function getKolTweets(page, handle) {
  try {
    await page.goto(`https://x.com/${handle}`, { timeout: 15000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000 + Math.random() * 1000); // Random delay
    
    const tweets = await page.evaluate(() => {
      const els = document.querySelectorAll('[data-testid="tweetText"]');
      return Array.from(els).slice(0, 3).map(el => el.innerText);
    });
    
    return tweets;
  } catch (err) {
    console.log(`  ⚠️  @${handle}: ${err.message.substring(0, 50)}`);
    return [];
  }
}

function selectKOLsForRun(sampleSize = 30) {
  // Always include priority KOLs
  const selected = new Set(PRIORITY_KOLS.filter(k => ALL_KOLS.map(a => a.toLowerCase()).includes(k.toLowerCase())));
  
  // Fill remaining slots with random KOLs
  const remaining = ALL_KOLS.filter(k => !selected.has(k.toLowerCase()));
  const shuffled = remaining.sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < sampleSize - selected.size && i < shuffled.length; i++) {
    selected.add(shuffled[i]);
  }
  
  return Array.from(selected);
}

export async function scanX(options = {}) {
  const kolSampleSize = options.sample || 30;
  const selectedKOLs = selectKOLsForRun(kolSampleSize);
  
  console.log(`🔍 X Scanner v2 - Scanning ${selectedKOLs.length} KOLs (from ${ALL_KOLS.length} total)`);
  
  const seenFile = join(ROOT, 'data', 'seen-x.json');
  const seen = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : { hashes: [] };
  const seenSet = new Set(seen.hashes);
  const results = [];

  const { browser, ctx } = await createContext();
  const page = await ctx.newPage();

  try {
    // KOL monitoring
    for (const handle of selectedKOLs) {
      const tweets = await getKolTweets(page, handle);
      
      for (const text of tweets) {
        const hash = text.substring(0, 80);
        if (seenSet.has(hash)) continue;
        seenSet.add(hash);
        
        // Check for crypto mentions
        const lowerText = text.toLowerCase();
        const hasCrypto = /\$[A-Z]{2,8}|memecoin|solana|eth|btc|token|pump|gem|dex|chain/i.test(text);
        
        if (hasCrypto) {
          results.push({ 
            source: `x:${handle}`, 
            handle, 
            text, 
            time: new Date().toISOString() 
          });
        }
      }
      
      console.log(`  ✅ @${handle}: ${tweets.length} tweets (${results.filter(r => r.handle === handle).length} new crypto mentions)`);
      
      await page.waitForTimeout(2000 + Math.random() * 1000); // Anti-rate-limit delay
    }
  } catch (err) {
    console.error(`Scanner error: ${err.message}`);
  } finally {
    await browser.close();
  }

  // Update seen hashes
  seen.hashes = [...seenSet].slice(-20000); // Keep last 20K
  writeFileSync(seenFile, JSON.stringify(seen, null, 2));

  // Write output
  const output = {
    scan_time: new Date().toISOString(),
    total_kols_in_db: ALL_KOLS.length,
    kols_scanned: selectedKOLs.length,
    new_mentions: results.length,
    results
  };
  
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  
  console.log(`\n✅ Scan complete:`);
  console.log(`   New crypto mentions: ${results.length}`);
  console.log(`   Coverage: ${selectedKOLs.length}/${ALL_KOLS.length} KOLs (${(selectedKOLs.length/ALL_KOLS.length*100).toFixed(1)}%)`);
  console.log(`   Output: ${OUTPUT_FILE}`);
  
  return results;
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sample = parseInt(process.argv[2]) || 30;
  console.log(`Running with sample size: ${sample}\n`);
  
  const results = await scanX({ sample });
  
  if (results.length > 0) {
    console.log(`\n🎯 Sample mentions:\n`);
    results.slice(0, 5).forEach(r => {
      console.log(`  @${r.handle}: ${r.text.substring(0, 100)}...`);
    });
  }
}
