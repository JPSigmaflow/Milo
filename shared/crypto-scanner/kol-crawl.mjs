import { readFileSync, writeFileSync } from 'fs';
import { setTimeout } from 'timers/promises';

const KOL_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-verified-active.json';
const REPORT_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-audit-report-2026-03-03.md';

const kols = JSON.parse(readFileSync(KOL_PATH, 'utf8'));
const results = [];
let success = 0, failed = 0, suspended = 0;

for (let i = 0; i < kols.length; i++) {
  const kol = kols[i];
  const handle = kol.handle;
  console.log(`[${i+1}/${kols.length}] Crawling @${handle}...`);
  
  try {
    const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });
    
    if (!resp.ok) {
      console.log(`  ❌ HTTP ${resp.status}`);
      results.push({ handle, status: 'ERROR', error: `HTTP ${resp.status}` });
      failed++;
      // Check if suspended
      if (resp.status === 403 || resp.status === 404) {
        kol.status = 'SUSPENDED?';
        suspended++;
      }
    } else {
      const html = await resp.text();
      
      // Extract followers
      const followersMatch = html.match(/(\d[\d,\.]*)\s*Followers/i) || html.match(/"followers_count":(\d+)/);
      const followers = followersMatch ? parseInt(followersMatch[1].replace(/[,\.]/g, '')) : null;
      
      // Extract tweet count  
      const tweetMatch = html.match(/(\d[\d,\.]*)\s*(?:Tweets|posts)/i) || html.match(/"statuses_count":(\d+)/);
      const tweets = tweetMatch ? parseInt(tweetMatch[1].replace(/[,\.]/g, '')) : null;
      
      // Extract last tweet date - look for datetime attributes
      const dateMatch = html.match(/datetime="(\d{4}-\d{2}-\d{2})/);
      const lastTweet = dateMatch ? dateMatch[1] : null;
      
      // Also try to find name
      const nameMatch = html.match(/"name":"([^"]+)"/);
      
      console.log(`  ✅ Followers: ${followers ?? 'N/A'}, Tweets: ${tweets ?? 'N/A'}, Last: ${lastTweet ?? 'N/A'}`);
      
      // Update KOL data
      if (followers !== null) kol.followers = followers;
      if (tweets !== null) kol.tweetCount = tweets;
      if (lastTweet !== null) kol.lastTweetDate = lastTweet;
      kol.lastAudit = '2026-03-03';
      
      results.push({ 
        handle, 
        status: 'OK', 
        followers: followers ?? kol.followers, 
        tweetCount: tweets ?? kol.tweetCount, 
        lastTweet: lastTweet ?? 'N/A',
        category: kol.category,
        cluster: kol.cluster
      });
      success++;
    }
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
    results.push({ handle, status: 'ERROR', error: err.message });
    failed++;
  }
  
  // Random delay 3-5 seconds
  const delay = 3000 + Math.random() * 2000;
  await setTimeout(delay);
}

// Write updated JSON
writeFileSync(KOL_PATH, JSON.stringify(kols, null, 2));
console.log(`\n✅ Updated ${KOL_PATH}`);

// Generate report
const now = new Date().toISOString();
let report = `# KOL Audit Report — 2026-03-03\n\n`;
report += `**Crawl Time:** ${now}\n`;
report += `**Total KOLs:** ${kols.length}\n`;
report += `**Successful:** ${success} | **Failed:** ${failed} | **Possibly Suspended:** ${suspended}\n\n`;

// Top KOLs by followers
const sorted = results.filter(r => r.status === 'OK').sort((a, b) => (b.followers || 0) - (a.followers || 0));

report += `## Top 20 by Followers\n\n`;
report += `| # | Handle | Followers | Tweets | Last Tweet | Category |\n`;
report += `|---|--------|-----------|--------|------------|----------|\n`;
sorted.slice(0, 20).forEach((r, i) => {
  report += `| ${i+1} | @${r.handle} | ${(r.followers || 0).toLocaleString()} | ${(r.tweetCount || 0).toLocaleString()} | ${r.lastTweet} | ${r.category || '-'} |\n`;
});

report += `\n## Recently Active (Last Tweet ≤ 7 days)\n\n`;
const recent = sorted.filter(r => r.lastTweet && r.lastTweet >= '2026-02-24');
report += `| Handle | Followers | Last Tweet | Category |\n`;
report += `|--------|-----------|------------|----------|\n`;
recent.forEach(r => {
  report += `| @${r.handle} | ${(r.followers || 0).toLocaleString()} | ${r.lastTweet} | ${r.category || '-'} |\n`;
});
if (recent.length === 0) report += `| (none found) | - | - | - |\n`;

report += `\n## Possibly Inactive / Suspended\n\n`;
const errors = results.filter(r => r.status === 'ERROR');
errors.forEach(r => {
  report += `- ❌ @${r.handle}: ${r.error}\n`;
});
if (errors.length === 0) report += `- (none)\n`;

report += `\n## Full List\n\n`;
report += `| Handle | Status | Followers | Tweets | Last Tweet | Cluster |\n`;
report += `|--------|--------|-----------|--------|------------|--------|\n`;
results.forEach(r => {
  if (r.status === 'OK') {
    report += `| @${r.handle} | ✅ | ${(r.followers || 0).toLocaleString()} | ${(r.tweetCount || 0).toLocaleString()} | ${r.lastTweet} | ${r.cluster || '-'} |\n`;
  } else {
    report += `| @${r.handle} | ❌ | - | - | - | ${r.error} |\n`;
  }
});

writeFileSync(REPORT_PATH, report);
console.log(`✅ Report written to ${REPORT_PATH}`);

// Output summary for messaging
console.log(`\n--- SUMMARY ---`);
console.log(`SUCCESS:${success}`);
console.log(`FAILED:${failed}`);
console.log(`SUSPENDED:${suspended}`);
console.log(`RECENT:${recent.length}`);
