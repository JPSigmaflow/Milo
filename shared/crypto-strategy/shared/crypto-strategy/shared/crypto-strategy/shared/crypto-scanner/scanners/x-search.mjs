import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Crypto KOLs and search terms to monitor
const SEARCHES = [
  'solana memecoin viral',
  'pump.fun trending',
  'crypto gem 100x',
  'meme coin just launched',
  'viral cat dog token',
];

const PROFILES = [
  'MustStopMurad', 'CryptoKaleo', 'blaboratory', 'DegenSpartan',
  'MoonOverlord', 'GiganticRebirth', 'inversebrah', 'CryptoGodJohn',
  'AltcoinSherpa', 'TheCryptoDog', 'CryptoWizardd', 'Rewkang',
  'HsakaTrades', 'CryptoCred', 'SmartContracter', 'CryptoCapo_',
  'MacnBTC', 'ColdBloodShill', 'AngeloBTC', 'CryptoTony__',
];

export async function scanX() {
  console.log(`[X] Launching browser for X search...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  
  const results = [];
  
  for (const query of SEARCHES) {
    try {
      const page = await context.newPage();
      const url = `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`;
      console.log(`[X] Searching: "${query}"`);
      await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      
      // Extract tweet text from the page
      const tweets = await page.evaluate(() => {
        const els = document.querySelectorAll('[data-testid="tweetText"]');
        return Array.from(els).slice(0, 10).map(el => ({
          text: el.innerText,
          time: new Date().toISOString()
        }));
      });
      
      for (const t of tweets) {
        results.push({ source: 'x-search', query, text: t.text, time: t.time });
      }
      console.log(`[X] Found ${tweets.length} tweets for "${query}"`);
      await page.close();
    } catch (e) {
      console.log(`[X] Error searching "${query}": ${e.message}`);
    }
  }
  
  await browser.close();
  console.log(`[X] Total: ${results.length} tweets collected`);
  return results;
}

// Standalone test
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await scanX();
  console.log(JSON.stringify(r.slice(0, 5), null, 2));
}
