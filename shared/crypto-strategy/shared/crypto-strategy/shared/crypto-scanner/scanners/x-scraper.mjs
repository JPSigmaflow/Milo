import { chromium } from 'playwright';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function scanXProfiles(profiles = []) {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  
  // Use mobile user agent - more permissive
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 }
  });

  for (const profile of profiles.slice(0, 20)) {
    try {
      const page = await ctx.newPage();
      // Use the embed/syndication timeline - this is PUBLIC
      await page.goto(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${profile}`, { 
        timeout: 10000, 
        waitUntil: 'networkidle' 
      });
      
      const tweets = await page.evaluate(() => {
        const items = document.querySelectorAll('.timeline-Tweet-text');
        if (items.length > 0) {
          return Array.from(items).slice(0, 5).map(el => el.innerText);
        }
        // Fallback: try any text content
        const all = document.querySelectorAll('article, .tweet, [data-testid="tweet"]');
        return Array.from(all).slice(0, 5).map(el => el.innerText?.substring(0, 300));
      });
      
      if (tweets.length > 0) {
        console.log(`[X] @${profile}: ${tweets.length} tweets`);
        for (const t of tweets) {
          results.push({ source: `x-${profile}`, text: t, time: new Date().toISOString() });
        }
      } else {
        // Try extracting from raw HTML
        const html = await page.content();
        const matches = html.match(/(?:tweetText|tweet-text)[^>]*>([^<]+)/gi) || [];
        console.log(`[X] @${profile}: ${matches.length} from HTML parse`);
      }
      await page.close();
    } catch(e) {
      console.log(`[X] @${profile}: timeout/error`);
    }
  }
  
  await browser.close();
  return results;
}

// Test
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const profiles = ['lookonchain', 'whale_alert', 'MustStopMurad'];
  const r = await scanXProfiles(profiles);
  console.log(`\nTotal: ${r.length} tweets`);
  r.forEach(t => console.log(`  [${t.source}] ${t.text?.substring(0, 100)}`));
}
