import { readFileSync, writeFileSync } from 'fs';
import { setTimeout } from 'timers/promises';

const KOL_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-verified-active.json';
const REPORT_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-audit-report-2026-03-03.md';

const kols = JSON.parse(readFileSync(KOL_PATH, 'utf8'));
const results = [];
let success = 0, failed = 0;

// Try multiple approaches
async function crawlKOL(handle) {
  // Approach 1: nitter/xcancel instances
  const urls = [
    `https://nitter.privacydev.net/${handle}`,
    `https://xcancel.com/${handle}`,
    `https://nitter.poast.org/${handle}`,
  ];
  
  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const tid = global.setTimeout(() => ctrl.abort(), 15000);
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        signal: ctrl.signal,
        redirect: 'follow'
      });
      clearTimeout(tid);
      
      if (!resp.ok) continue;
      const html = await resp.text();
      
      // Nitter format: followers in stats
      const followersMatch = html.match(/class="profile-stat-num"[^>]*>([\d,\.]+)<\/span>\s*<\/a>\s*<span[^>]*>Followers/is)
        || html.match(/([\d,\.]+)\s*Followers/i)
        || html.match(/followers.*?([\d,]+)/is);
      
      const tweetMatch = html.match(/class="profile-stat-num"[^>]*>([\d,\.]+)<\/span>\s*<\/a>\s*<span[^>]*>(?:Tweets|Posts)/is)
        || html.match(/([\d,\.]+)\s*(?:Tweets|Posts)/i);
      
      // Last tweet date
      const dateMatch = html.match(/title="([^"]*\d{4}[^"]*)"/);
      let lastTweet = null;
      if (dateMatch) {
        try {
          const d = new Date(dateMatch[1]);
          if (!isNaN(d.getTime())) lastTweet = d.toISOString().slice(0, 10);
        } catch {}
      }
      
      const followers = followersMatch ? parseInt(followersMatch[1].replace(/[,\.]/g, '')) : null;
      const tweets = tweetMatch ? parseInt(tweetMatch[1].replace(/[,\.]/g, '')) : null;
      
      if (followers !== null || tweets !== null) {
        return { followers, tweets, lastTweet, source: url.split('/')[2] };
      }
    } catch {}
  }
  
  return null;
}

for (let i = 0; i < kols.length; i++) {
  const kol = kols[i];
  console.log(`[${i+1}/${kols.length}] @${kol.handle}...`);
  
  const data = await crawlKOL(kol.handle);
  
  if (data) {
    console.log(`  ✅ F:${data.followers} T:${data.tweets} D:${data.lastTweet} (${data.source})`);
    if (data.followers) kol.followers = data.followers;
    if (data.tweets) kol.tweetCount = data.tweets;
    if (data.lastTweet) kol.lastTweetDate = data.lastTweet;
    kol.lastAudit = '2026-03-03';
    results.push({ handle: kol.handle, ok: true, ...data, category: kol.category, cluster: kol.cluster });
    success++;
  } else {
    console.log(`  ❌ All sources failed`);
    results.push({ handle: kol.handle, ok: false, category: kol.category, cluster: kol.cluster });
    failed++;
  }
  
  // 6-10 second delay to be safe
  await setTimeout(6000 + Math.random() * 4000);
}

writeFileSync(KOL_PATH, JSON.stringify(kols, null, 2));
console.log(`\nJSON updated.`);

// Report
let report = `# KOL Audit Report — 2026-03-03\n\n`;
report += `**Total:** ${kols.length} | **Success:** ${success} | **Failed:** ${failed}\n\n`;

report += `## Top 20 by Followers\n\n`;
report += `| # | Handle | Followers | Tweets | Last Tweet | Category |\n|---|--------|-----------|--------|------------|----------|\n`;
const ok = results.filter(r => r.ok).sort((a, b) => (b.followers||0) - (a.followers||0));
ok.slice(0, 20).forEach((r, i) => {
  report += `| ${i+1} | @${r.handle} | ${(r.followers||0).toLocaleString()} | ${(r.tweets||0).toLocaleString()} | ${r.lastTweet||'N/A'} | ${r.category||'-'} |\n`;
});

const recent = ok.filter(r => r.lastTweet && r.lastTweet >= '2026-02-24');
report += `\n## Active Last 7 Days (${recent.length})\n\n`;
recent.forEach(r => report += `- @${r.handle} (${r.lastTweet})\n`);

report += `\n## Failed (${failed})\n\n`;
results.filter(r => !r.ok).forEach(r => report += `- @${r.handle}\n`);

report += `\n## Full Results\n\n`;
report += `| Handle | Followers | Tweets | Last Tweet | Cluster |\n|--------|-----------|--------|------------|--------|\n`;
results.forEach(r => {
  if (r.ok) report += `| @${r.handle} | ${(r.followers||0).toLocaleString()} | ${(r.tweets||0).toLocaleString()} | ${r.lastTweet||'N/A'} | ${r.cluster||'-'} |\n`;
  else report += `| @${r.handle} | ❌ | - | - | ${r.cluster||'-'} |\n`;
});

writeFileSync(REPORT_PATH, report);
console.log(`Report written.`);
console.log(`\n---DONE--- S:${success} F:${failed}`);
