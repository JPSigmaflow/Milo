import { readFileSync, writeFileSync } from 'fs';
import { setTimeout } from 'timers/promises';
import { execSync } from 'child_process';

const KOL_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-verified-active.json';
const REPORT_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-audit-report-2026-03-03.md';

const kols = JSON.parse(readFileSync(KOL_PATH, 'utf8'));
const results = [];
let success = 0, failed = 0;

function parseNum(s) {
  return parseInt(s.replace(/,/g, ''));
}

function crawl(handle) {
  try {
    const html = execSync(
      `curl -s -L -m 25 -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15" "https://xcancel.com/${handle}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    
    if (!html || html.length < 500 || html.includes('Instance has been rate limited')) return null;
    
    // Followers: <li class="followers">...<span class="profile-stat-num">235,780,106</span>
    let followers = null;
    const fMatch = html.match(/class="followers"[\s\S]*?profile-stat-num">([\d,]+)</);
    if (fMatch) followers = parseNum(fMatch[1]);
    
    // Tweets: <li class="posts">...<span class="profile-stat-num">98,277</span>
    let tweets = null;
    const tMatch = html.match(/class="posts"[\s\S]*?profile-stat-num">([\d,]+)</);
    if (tMatch) tweets = parseNum(tMatch[1]);
    
    // Last tweet date: title="Mar 2, 2026 · 4:01 PM UTC"
    let lastTweet = null;
    const dates = [...html.matchAll(/title="(\w+ \d+, \d{4}) · [^"]*UTC"/g)];
    if (dates.length > 0) {
      // First non-pinned tweet date, or just the first one
      const d = new Date(dates[0][1]);
      if (!isNaN(d.getTime())) lastTweet = d.toISOString().slice(0, 10);
    }
    
    // Check if account is suspended
    if (html.includes('This account has been suspended') || html.includes('Account suspended')) {
      return { suspended: true };
    }
    
    if (followers || tweets) {
      return { followers, tweets, lastTweet };
    }
    return null;
  } catch {
    return null;
  }
}

for (let i = 0; i < kols.length; i++) {
  const kol = kols[i];
  process.stdout.write(`[${i+1}/${kols.length}] @${kol.handle} `);
  
  let data = crawl(kol.handle);
  
  // Retry once on failure
  if (!data) {
    await setTimeout(10000);
    data = crawl(kol.handle);
  }
  
  if (data && !data.suspended) {
    if (data.followers) kol.followers = data.followers;
    if (data.tweets) kol.tweetCount = data.tweets;
    if (data.lastTweet) kol.lastTweetDate = data.lastTweet;
    kol.lastAudit = '2026-03-03';
    results.push({ handle: kol.handle, ok: true, followers: data.followers || kol.followers, tweets: data.tweets || kol.tweetCount, lastTweet: data.lastTweet, category: kol.category, cluster: kol.cluster });
    success++;
    console.log(`✅ F:${data.followers||'-'} T:${data.tweets||'-'} D:${data.lastTweet||'-'}`);
  } else if (data?.suspended) {
    kol.status = 'SUSPENDED';
    kol.lastAudit = '2026-03-03';
    results.push({ handle: kol.handle, ok: false, suspended: true, category: kol.category, cluster: kol.cluster });
    failed++;
    console.log(`🚫 SUSPENDED`);
  } else {
    results.push({ handle: kol.handle, ok: false, followers: kol.followers, tweets: kol.tweetCount, category: kol.category, cluster: kol.cluster });
    failed++;
    console.log(`❌`);
  }
  
  // 5-8 seconds between requests
  await setTimeout(5000 + Math.random() * 3000);
}

writeFileSync(KOL_PATH, JSON.stringify(kols, null, 2));

// Generate report
const now = new Date().toISOString();
const okResults = results.filter(r => r.ok).sort((a, b) => (b.followers||0) - (a.followers||0));
const failedResults = results.filter(r => !r.ok);
const recentlyActive = okResults.filter(r => r.lastTweet && r.lastTweet >= '2026-02-24');

let report = `# KOL Audit Report — 2026-03-03\n\n`;
report += `**Crawl:** ${now}\n**Total:** ${kols.length} | **Fresh:** ${success} | **Failed:** ${failed}\n\n`;

report += `## Top 20 by Followers\n\n`;
report += `| # | Handle | Followers | Tweets | Last Tweet | Category |\n|---|--------|-----------|--------|------------|----------|\n`;
okResults.slice(0, 20).forEach((r, i) => {
  report += `| ${i+1} | @${r.handle} | ${(r.followers||0).toLocaleString()} | ${(r.tweets||0).toLocaleString()} | ${r.lastTweet||'N/A'} | ${r.category||'-'} |\n`;
});

report += `\n## Active Last 7 Days (${recentlyActive.length})\n\n`;
report += `| Handle | Followers | Last Tweet | Category |\n|--------|-----------|------------|----------|\n`;
recentlyActive.forEach(r => {
  report += `| @${r.handle} | ${(r.followers||0).toLocaleString()} | ${r.lastTweet} | ${r.category||'-'} |\n`;
});

if (failedResults.length > 0) {
  report += `\n## Failed/Unreachable (${failedResults.length})\n\n`;
  failedResults.forEach(r => {
    report += `- @${r.handle}${r.suspended ? ' 🚫 SUSPENDED' : ''}\n`;
  });
}

report += `\n## Complete List\n\n`;
report += `| Handle | ✓ | Followers | Tweets | Last Tweet | Cluster |\n|--------|---|-----------|--------|------------|--------|\n`;
results.sort((a, b) => (b.followers||0) - (a.followers||0)).forEach(r => {
  report += `| @${r.handle} | ${r.ok?'✅':r.suspended?'🚫':'⚠️'} | ${(r.followers||0).toLocaleString()} | ${(r.tweets||0).toLocaleString()} | ${r.lastTweet||'N/A'} | ${r.cluster||'-'} |\n`;
});

writeFileSync(REPORT_PATH, report);
console.log(`\n===DONE=== Success:${success} Failed:${failed} Recent:${recentlyActive.length}`);
