// This script will be run via the browser tool approach
// For now, let's use a different data source: Twitter's public API via publish.twitter.com
import { readFileSync, writeFileSync } from 'fs';
import { setTimeout } from 'timers/promises';
import { execSync } from 'child_process';

const KOL_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-verified-active.json';
const REPORT_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-audit-report-2026-03-03.md';

const kols = JSON.parse(readFileSync(KOL_PATH, 'utf8'));
const results = [];
let success = 0, failed = 0;

function parseNum(s) { return parseInt(s.replace(/[,\.]/g, '')); }

// Use Twitter's oEmbed endpoint to verify activity, and tweeterid.com for stats
async function crawlTwitterProfile(handle) {
  try {
    // Try Twitter's public timeline via syndication with longer delay
    const resp = await fetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://platform.twitter.com/',
        'Origin': 'https://platform.twitter.com'
      }
    });
    
    if (resp.status === 429) return { rateLimited: true };
    if (!resp.ok) return null;
    
    const html = await resp.text();
    if (html.length < 200) return null;
    
    // Parse the syndication embed format
    // Look for follower count in data attributes or JSON
    let followers = null, tweets = null, lastTweet = null;
    
    // The syndication API returns an HTML widget with embedded data
    const followersMatch = html.match(/"followers_count"\s*:\s*(\d+)/);
    if (followersMatch) followers = parseInt(followersMatch[1]);
    
    const tweetsMatch = html.match(/"statuses_count"\s*:\s*(\d+)/);
    if (tweetsMatch) tweets = parseInt(tweetsMatch[1]);
    
    // Get dates from tweets
    const dateMatches = [...html.matchAll(/datetime="([^"]+)"/g)];
    if (dateMatches.length > 0) {
      const d = new Date(dateMatches[0][1]);
      if (!isNaN(d.getTime())) lastTweet = d.toISOString().slice(0, 10);
    }
    
    // Also try to find stats from the profile header
    if (!followers) {
      const fAlt = html.match(/(\d[\d,]*)\s*Followers/);
      if (fAlt) followers = parseNum(fAlt[1]);
    }
    
    if (followers || tweets || lastTweet) return { followers, tweets, lastTweet };
    return null;
  } catch {
    return null;
  }
}

// Progressive approach: try syndication API with very long delays (30s+)
let consecutiveRateLimits = 0;
let baseDelay = 30000; // Start with 30 seconds

for (let i = 0; i < kols.length; i++) {
  const kol = kols[i];
  process.stdout.write(`[${i+1}/${kols.length}] @${kol.handle} `);
  
  const data = await crawlTwitterProfile(kol.handle);
  
  if (data?.rateLimited) {
    consecutiveRateLimits++;
    console.log(`⏳ RL (${consecutiveRateLimits})`);
    
    // Exponential backoff on rate limits
    if (consecutiveRateLimits >= 3) {
      console.log(`⏳ Heavy rate limit, waiting ${baseDelay * 2 / 1000}s...`);
      baseDelay = Math.min(baseDelay * 1.5, 120000);
      await setTimeout(baseDelay);
    }
    
    results.push({ handle: kol.handle, ok: false, followers: kol.followers, tweets: kol.tweetCount, category: kol.category, cluster: kol.cluster });
    failed++;
  } else if (data) {
    consecutiveRateLimits = 0;
    baseDelay = 30000;
    
    if (data.followers) kol.followers = data.followers;
    if (data.tweets) kol.tweetCount = data.tweets;
    if (data.lastTweet) kol.lastTweetDate = data.lastTweet;
    kol.lastAudit = '2026-03-03';
    
    results.push({ handle: kol.handle, ok: true, followers: data.followers || kol.followers, tweets: data.tweets || kol.tweetCount, lastTweet: data.lastTweet, category: kol.category, cluster: kol.cluster });
    success++;
    console.log(`✅ F:${data.followers||'-'} T:${data.tweets||'-'} D:${data.lastTweet||'-'}`);
  } else {
    results.push({ handle: kol.handle, ok: false, followers: kol.followers, tweets: kol.tweetCount, category: kol.category, cluster: kol.cluster });
    failed++;
    console.log(`❌`);
  }
  
  await setTimeout(baseDelay + Math.random() * 10000);
}

writeFileSync(KOL_PATH, JSON.stringify(kols, null, 2));

// Report
const okR = results.filter(r => r.ok).sort((a, b) => (b.followers||0) - (a.followers||0));
const recent = okR.filter(r => r.lastTweet && r.lastTweet >= '2026-02-24');

let report = `# KOL Audit Report — 2026-03-03\n\n`;
report += `**Total:** ${kols.length} | **Fresh:** ${success} | **Cached:** ${failed}\n\n`;

report += `## Top 20\n\n| # | Handle | Followers | Tweets | Last Tweet | Category |\n|---|--------|-----------|--------|------------|----------|\n`;
okR.slice(0, 20).forEach((r, i) => {
  report += `| ${i+1} | @${r.handle} | ${(r.followers||0).toLocaleString()} | ${(r.tweets||0).toLocaleString()} | ${r.lastTweet||'N/A'} | ${r.category||'-'} |\n`;
});

report += `\n## Active Last 7d (${recent.length})\n\n`;
recent.forEach(r => report += `- @${r.handle} (${r.lastTweet})\n`);

report += `\n## All\n\n| Handle | ✓ | Followers | Tweets | Last |\n|--------|---|-----------|--------|------|\n`;
results.sort((a,b)=>(b.followers||0)-(a.followers||0)).forEach(r => {
  report += `| @${r.handle} | ${r.ok?'✅':'⚠️'} | ${(r.followers||0).toLocaleString()} | ${(r.tweets||0).toLocaleString()} | ${r.lastTweet||'N/A'} |\n`;
});

writeFileSync(REPORT_PATH, report);
console.log(`\n===DONE=== S:${success} F:${failed}`);
