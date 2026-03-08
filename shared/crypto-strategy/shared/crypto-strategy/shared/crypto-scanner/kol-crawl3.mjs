import { readFileSync, writeFileSync } from 'fs';
import { setTimeout } from 'timers/promises';
import { execSync } from 'child_process';

const KOL_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-verified-active.json';
const REPORT_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-audit-report-2026-03-03.md';

const kols = JSON.parse(readFileSync(KOL_PATH, 'utf8'));
const results = [];
let success = 0, failed = 0;

async function crawlXcancel(handle, attempt = 1) {
  try {
    // Use curl with specific headers to avoid blocks
    const cmd = `curl -s -L -m 20 -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15" -H "Accept: text/html" "https://xcancel.com/${handle}"`;
    const html = execSync(cmd, { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
    
    if (!html || html.length < 500) return null;
    
    // Parse followers - xcancel shows "X Followers" in profile stats
    let followers = null;
    // Pattern: <span class="profile-stat-num">1,234</span> near Followers
    const statBlocks = html.match(/profile-stat-num[^>]*>([^<]+)<\/span>\s*<\/a>\s*<span[^>]*>([^<]+)</g);
    if (statBlocks) {
      for (const block of statBlocks) {
        if (/Follower/i.test(block)) {
          const m = block.match(/>([\d,\.]+\s*[KMB]?)</);
          if (m) followers = parseNum(m[1]);
        }
      }
    }
    // Fallback: simpler pattern
    if (!followers) {
      const fm = html.match(/([\d,\.]+\s*[KMB]?)\s*Followers/i);
      if (fm) followers = parseNum(fm[1]);
    }
    
    // Parse tweets
    let tweets = null;
    const tm = html.match(/([\d,\.]+\s*[KMB]?)\s*(?:Tweets|Posts)/i);
    if (tm) tweets = parseNum(tm[1]);
    
    // Parse last tweet date
    let lastTweet = null;
    const dm = html.match(/(\w+ \d+, \d{4})/);
    if (dm) {
      try {
        const d = new Date(dm[1]);
        if (!isNaN(d.getTime())) lastTweet = d.toISOString().slice(0, 10);
      } catch {}
    }
    
    if (followers || tweets) {
      return { followers, tweets, lastTweet };
    }
    return null;
  } catch (err) {
    if (attempt < 3) {
      await setTimeout(15000 * attempt);
      return crawlXcancel(handle, attempt + 1);
    }
    return null;
  }
}

function parseNum(s) {
  s = s.trim();
  let mult = 1;
  if (/K$/i.test(s)) { mult = 1000; s = s.replace(/K$/i, ''); }
  if (/M$/i.test(s)) { mult = 1000000; s = s.replace(/M$/i, ''); }
  if (/B$/i.test(s)) { mult = 1000000000; s = s.replace(/B$/i, ''); }
  const n = parseFloat(s.replace(/,/g, ''));
  return isNaN(n) ? null : Math.round(n * mult);
}

// Process in batches of 5 with 20s pause between batches
const BATCH = 5;
for (let i = 0; i < kols.length; i += BATCH) {
  const batch = kols.slice(i, i + BATCH);
  
  for (let j = 0; j < batch.length; j++) {
    const idx = i + j;
    const kol = batch[j];
    console.log(`[${idx+1}/${kols.length}] @${kol.handle}`);
    
    const data = await crawlXcancel(kol.handle);
    if (data) {
      if (data.followers) kol.followers = data.followers;
      if (data.tweets) kol.tweetCount = data.tweets;
      if (data.lastTweet) kol.lastTweetDate = data.lastTweet;
      kol.lastAudit = '2026-03-03';
      results.push({ handle: kol.handle, ok: true, ...data, category: kol.category, cluster: kol.cluster });
      success++;
      console.log(`  ✅ F:${data.followers||'-'} T:${data.tweets||'-'} D:${data.lastTweet||'-'}`);
    } else {
      results.push({ handle: kol.handle, ok: false, followers: kol.followers, tweets: kol.tweetCount, category: kol.category, cluster: kol.cluster });
      failed++;
      console.log(`  ❌`);
    }
    
    // 8-12s between individual requests
    await setTimeout(8000 + Math.random() * 4000);
  }
  
  // 20-30s pause between batches
  if (i + BATCH < kols.length) {
    console.log(`--- Batch pause (20-30s) ---`);
    await setTimeout(20000 + Math.random() * 10000);
  }
}

// Save
writeFileSync(KOL_PATH, JSON.stringify(kols, null, 2));

// Report
let report = `# KOL Audit Report — 2026-03-03\n\n`;
report += `**Crawled:** ${kols.length} | **Fresh Data:** ${success} | **Cached/Failed:** ${failed}\n\n`;

const all = results.sort((a, b) => (b.followers||0) - (a.followers||0));

report += `## Top 20\n\n| # | Handle | Followers | Tweets | Last Tweet | Category |\n|---|--------|-----------|--------|------------|----------|\n`;
all.filter(r=>r.ok).slice(0,20).forEach((r,i) => {
  report += `| ${i+1} | @${r.handle} | ${(r.followers||0).toLocaleString()} | ${(r.tweets||0).toLocaleString()} | ${r.lastTweet||'N/A'} | ${r.category||'-'} |\n`;
});

report += `\n## All Results\n\n| Handle | Status | Followers | Category |\n|--------|--------|-----------|----------|\n`;
all.forEach(r => {
  report += `| @${r.handle} | ${r.ok?'✅':'⚠️ cached'} | ${(r.followers||0).toLocaleString()} | ${r.category||'-'} |\n`;
});

writeFileSync(REPORT_PATH, report);
console.log(`\n===DONE=== Success:${success} Failed:${failed}`);
