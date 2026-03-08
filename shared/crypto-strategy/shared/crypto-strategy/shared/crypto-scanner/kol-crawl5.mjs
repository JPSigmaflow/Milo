import { readFileSync, writeFileSync } from 'fs';
import { setTimeout } from 'timers/promises';
import { execSync } from 'child_process';

const KOL_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-verified-active.json';
const REPORT_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-audit-report-2026-03-03.md';
const PROGRESS_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-crawl-progress.json';

const kols = JSON.parse(readFileSync(KOL_PATH, 'utf8'));

// Resume from progress if exists
let progress;
try {
  progress = JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'));
} catch {
  progress = { results: [], startIdx: 0 };
}

const results = progress.results;
let success = results.filter(r => r.ok).length;
let failed = results.filter(r => !r.ok).length;

const UAs = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15',
];

function parseNum(s) { return parseInt(s.replace(/,/g, '')); }

function crawl(handle, ua) {
  try {
    const html = execSync(
      `curl -s -L -m 30 --retry 2 --retry-delay 5 -H "User-Agent: ${ua}" -H "Accept: text/html,application/xhtml+xml" -H "Accept-Language: en-US,en;q=0.9" "https://xcancel.com/${handle}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    
    if (!html || html.length < 500) return null;
    if (html.includes('Instance has been rate limited') || html.includes('rate limit')) return { rateLimited: true };
    if (html.includes('suspended') || html.includes('Account doesn')) return { suspended: true };
    
    let followers = null;
    const fMatch = html.match(/class="followers"[\s\S]*?profile-stat-num">([\d,]+)</);
    if (fMatch) followers = parseNum(fMatch[1]);
    
    let tweets = null;
    const tMatch = html.match(/class="posts"[\s\S]*?profile-stat-num">([\d,]+)</);
    if (tMatch) tweets = parseNum(tMatch[1]);
    
    let lastTweet = null;
    const dates = [...html.matchAll(/title="(\w+ \d+, \d{4}) · [^"]*UTC"/g)];
    if (dates.length > 0) {
      const d = new Date(dates[0][1]);
      if (!isNaN(d.getTime())) lastTweet = d.toISOString().slice(0, 10);
    }
    
    if (followers || tweets) return { followers, tweets, lastTweet };
    return null;
  } catch { return null; }
}

const startIdx = progress.startIdx;

for (let i = startIdx; i < kols.length; i++) {
  const kol = kols[i];
  const ua = UAs[i % UAs.length];
  process.stdout.write(`[${i+1}/${kols.length}] @${kol.handle} `);
  
  let data = crawl(kol.handle, ua);
  
  // If rate limited, wait 60s and retry
  if (data?.rateLimited) {
    console.log(`⏳ rate limited, waiting 60s...`);
    await setTimeout(60000);
    data = crawl(kol.handle, UAs[(i+1) % UAs.length]);
  }
  
  if (data && !data.suspended && !data.rateLimited) {
    if (data.followers) kol.followers = data.followers;
    if (data.tweets) kol.tweetCount = data.tweets;
    if (data.lastTweet) kol.lastTweetDate = data.lastTweet;
    kol.lastAudit = '2026-03-03';
    results.push({ handle: kol.handle, ok: true, followers: data.followers || kol.followers, tweets: data.tweets || kol.tweetCount, lastTweet: data.lastTweet, category: kol.category, cluster: kol.cluster });
    success++;
    console.log(`✅ F:${data.followers||'-'} T:${data.tweets||'-'} D:${data.lastTweet||'-'}`);
  } else {
    results.push({ handle: kol.handle, ok: false, suspended: data?.suspended, followers: kol.followers, tweets: kol.tweetCount, category: kol.category, cluster: kol.cluster });
    failed++;
    console.log(data?.suspended ? `🚫` : `❌`);
  }
  
  // Save progress every 10
  if (i % 10 === 9) {
    progress.results = results;
    progress.startIdx = i + 1;
    writeFileSync(PROGRESS_PATH, JSON.stringify(progress));
    writeFileSync(KOL_PATH, JSON.stringify(kols, null, 2));
  }
  
  // 15-25 seconds between requests
  await setTimeout(15000 + Math.random() * 10000);
}

// Final save
writeFileSync(KOL_PATH, JSON.stringify(kols, null, 2));

// Report
const okResults = results.filter(r => r.ok).sort((a, b) => (b.followers||0) - (a.followers||0));
const recentlyActive = okResults.filter(r => r.lastTweet && r.lastTweet >= '2026-02-24');

let report = `# KOL Audit Report — 2026-03-03\n\n`;
report += `**Crawled:** ${new Date().toISOString()}\n**Total:** ${kols.length} | **Fresh:** ${success} | **Failed/Cached:** ${failed}\n\n`;

report += `## Top 20 by Followers\n\n| # | Handle | Followers | Tweets | Last Tweet | Category |\n|---|--------|-----------|--------|------------|----------|\n`;
okResults.slice(0, 20).forEach((r, i) => {
  report += `| ${i+1} | @${r.handle} | ${(r.followers||0).toLocaleString()} | ${(r.tweets||0).toLocaleString()} | ${r.lastTweet||'N/A'} | ${r.category||'-'} |\n`;
});

report += `\n## Active Last 7 Days (${recentlyActive.length})\n\n| Handle | Followers | Last Tweet | Category |\n|--------|-----------|------------|----------|\n`;
recentlyActive.forEach(r => {
  report += `| @${r.handle} | ${(r.followers||0).toLocaleString()} | ${r.lastTweet} | ${r.category||'-'} |\n`;
});

const failedR = results.filter(r => !r.ok);
if (failedR.length > 0) {
  report += `\n## Failed (${failedR.length})\n\n`;
  failedR.forEach(r => report += `- @${r.handle}${r.suspended ? ' 🚫 SUSPENDED' : ''}\n`);
}

report += `\n## Complete List\n\n| Handle | ✓ | Followers | Tweets | Last Tweet | Cluster |\n|--------|---|-----------|--------|------------|--------|\n`;
results.sort((a, b) => (b.followers||0) - (a.followers||0)).forEach(r => {
  report += `| @${r.handle} | ${r.ok?'✅':r.suspended?'🚫':'⚠️'} | ${(r.followers||0).toLocaleString()} | ${(r.tweets||0).toLocaleString()} | ${r.lastTweet||'N/A'} | ${r.cluster||'-'} |\n`;
});

writeFileSync(REPORT_PATH, report);
console.log(`\n===DONE=== Success:${success} Failed:${failed} Recent:${recentlyActive.length}`);
