import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const config = JSON.parse(readFileSync(join(ROOT, 'config.json'), 'utf8'));

// Lower thresholds for discovery-focused subs
const LOW_THRESHOLD_SUBS = new Set([
  'CryptoMoonShots', 'SatoshiStreetBets', 'CryptoGemDiscovery',
  'altcoin', 'defi', 'ethtrader', 'solana', 'cosmosnetwork',
]);

export async function scanRedditPlaywright() {
  const seenFile = join(ROOT, 'data', 'seen.json');
  const seen = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : { redditPosts: [] };
  const seenSet = new Set(seen.redditPosts || []);
  const results = [];
  const defaultMinUp = config.reddit?.minUpvotes || 500;

  console.log('[Reddit-PW] Starting Playwright browser...');
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      extraHTTPHeaders: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    const page = await context.newPage();
    
    // Block images and other resources to speed up
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    for (const sub of (config.reddit?.subreddits || [])) {
      try {
        console.log(`[Reddit-PW] Scanning r/${sub}...`);
        
        // Try JSON API first
        const apiUrl = `https://www.reddit.com/r/${sub}/hot.json?limit=25&raw_json=1`;
        
        const response = await page.goto(apiUrl, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        if (!response || !response.ok()) {
          console.log(`[Reddit-PW] r/${sub}: API failed, status ${response?.status()}`);
          continue;
        }

        const jsonText = await page.textContent('body');
        let data;
        
        try {
          data = JSON.parse(jsonText);
        } catch (parseError) {
          console.log(`[Reddit-PW] r/${sub}: Failed to parse JSON - ${parseError.message}`);
          continue;
        }

        if (!data.data?.children) {
          console.log(`[Reddit-PW] r/${sub}: No posts found in response`);
          continue;
        }

        // Lower threshold for discovery subs
        const minUp = LOW_THRESHOLD_SUBS.has(sub) ? 50 : defaultMinUp;
        
        const posts = data.data.children.map(c => ({
          id: c.data.id,
          title: c.data.title || '',
          selftext: (c.data.selftext || '').substring(0, 2000),
          score: c.data.score || 0,
          num_comments: c.data.num_comments || 0,
          permalink: c.data.permalink || '',
          sub: sub,
          created_utc: c.data.created_utc || 0,
          author: c.data.author || '[deleted]',
          url: c.data.url || ''
        }));

        const viral = posts.filter(p => !seenSet.has(p.id) && p.score >= minUp);
        
        for (const p of viral) {
          seenSet.add(p.id);
          results.push({ 
            ...p, 
            source: 'reddit',
            scanned_at: new Date().toISOString(),
            scanner: 'playwright'
          });
        }
        
        console.log(`[Reddit-PW] r/${sub}: ${posts.length} posts, ${viral.length} viral (>${minUp} ups)`);
        
      } catch (error) {
        console.log(`[Reddit-PW] r/${sub}: error - ${error.message?.substring(0, 100)}`);
      }
      
      // Rate limiting - be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (globalError) {
    console.error(`[Reddit-PW] Global error: ${globalError.message}`);
  } finally {
    await browser.close();
  }

  // Update seen posts
  seen.redditPosts = [...seenSet].slice(-10000);
  writeFileSync(seenFile, JSON.stringify(seen));
  
  console.log(`[Reddit-PW] Total: ${results.length} new viral posts`);
  return results;
}

// Fallback function that tries Playwright first, then curl
export async function scanReddit() {
  try {
    console.log('[Reddit] Attempting Playwright scan...');
    return await scanRedditPlaywright();
  } catch (error) {
    console.log(`[Reddit] Playwright failed (${error.message}), falling back to curl...`);
    return await scanRedditCurl();
  }
}

// Original curl-based function as fallback
async function scanRedditCurl() {
  const { execSync } = await import('child_process');
  const seenFile = join(ROOT, 'data', 'seen.json');
  const seen = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : { redditPosts: [] };
  const seenSet = new Set(seen.redditPosts || []);
  const results = [];
  const defaultMinUp = config.reddit?.minUpvotes || 500;

  for (const sub of (config.reddit?.subreddits || [])) {
    try {
      const raw = execSync(
        `curl -sL -H "User-Agent: MiloCryptoBot/1.0" "https://www.reddit.com/r/${sub}/hot.json?limit=25&raw_json=1"`,
        { timeout: 15000 }
      ).toString();
      
      const data = JSON.parse(raw);
      const minUp = LOW_THRESHOLD_SUBS.has(sub) ? 50 : defaultMinUp;
      
      const posts = (data.data?.children || []).map(c => ({
        id: c.data.id,
        title: c.data.title || '',
        selftext: (c.data.selftext || '').substring(0, 2000),
        score: c.data.score || 0,
        num_comments: c.data.num_comments || 0,
        permalink: c.data.permalink || '',
        sub: sub
      }));

      const viral = posts.filter(p => !seenSet.has(p.id) && p.score >= minUp);
      for (const p of viral) {
        seenSet.add(p.id);
        results.push({ ...p, source: 'reddit', scanner: 'curl' });
      }
      console.log(`[Reddit-Curl] r/${sub}: ${posts.length} posts, ${viral.length} viral (>${minUp} ups)`);
    } catch(e) {
      console.log(`[Reddit-Curl] r/${sub}: error - ${e.message?.substring(0, 60)}`);
    }
    
    await new Promise(r => setTimeout(r, 1500));
  }

  seen.redditPosts = [...seenSet].slice(-10000);
  writeFileSync(seenFile, JSON.stringify(seen));
  console.log(`[Reddit-Curl] Total: ${results.length} new viral posts`);
  return results;
}