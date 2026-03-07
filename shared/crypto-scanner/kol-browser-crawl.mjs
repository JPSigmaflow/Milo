import { readFileSync, writeFileSync } from 'fs';
import { setTimeout } from 'timers/promises';

const KOL_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-verified-active.json';
const REPORT_PATH = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-audit-report-2026-03-03.md';
const CDP_URL = 'http://127.0.0.1:18800';

const kols = JSON.parse(readFileSync(KOL_PATH, 'utf8'));
const results = [];
let success = 0, failed = 0;

// Get the existing tab
async function getTab() {
  const resp = await fetch(`${CDP_URL}/json`);
  const tabs = await resp.json();
  return tabs.find(t => t.url.includes('xcancel.com')) || tabs[0];
}

// Connect to tab via WebSocket
async function connectTab(tab) {
  const ws = new (await import('ws')).default(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  
  let msgId = 1;
  const pending = new Map();
  
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  
  async function send(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve, reject) => {
      const timer = global.setTimeout(() => { pending.delete(id); reject(new Error('timeout')); }, 30000);
      pending.set(id, (msg) => { clearTimeout(timer); resolve(msg); });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  
  return { ws, send };
}

async function crawlHandle(send, handle) {
  // Navigate
  await send('Page.navigate', { url: `https://xcancel.com/${handle}` });
  
  // Wait for page load
  await setTimeout(4000);
  
  // Extract data
  const result = await send('Runtime.evaluate', {
    expression: `(() => {
      const stats = document.querySelectorAll('.profile-stat-num');
      const dates = document.querySelectorAll('.tweet-date a[title]');
      const title = document.title;
      if (title.includes('Verifying') || title.includes('rate limit') || stats.length === 0) {
        return JSON.stringify({ error: title.includes('Verifying') ? 'challenge' : 'no_data' });
      }
      return JSON.stringify({
        followers: stats[2]?.textContent?.trim(),
        tweets: stats[0]?.textContent?.trim(),
        lastTweet: dates[0]?.title
      });
    })()`
  });
  
  if (!result.result?.result?.value) return null;
  
  try {
    const data = JSON.parse(result.result.result.value);
    if (data.error) return data;
    return data;
  } catch {
    return null;
  }
}

function parseNum(s) {
  if (!s) return null;
  return parseInt(s.replace(/,/g, ''));
}

function parseDate(s) {
  if (!s) return null;
  const m = s.match(/(\w+ \d+, \d{4})/);
  if (!m) return null;
  const d = new Date(m[1]);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

async function main() {
  console.log('Connecting to browser...');
  const tab = await getTab();
  const { ws, send } = await connectTab(tab);
  
  await send('Page.enable');
  
  let challengeRetries = 0;
  
  for (let i = 0; i < kols.length; i++) {
    const kol = kols[i];
    process.stdout.write(`[${i+1}/${kols.length}] @${kol.handle} `);
    
    const data = await crawlHandle(send, kol.handle);
    
    if (data?.error === 'challenge') {
      challengeRetries++;
      console.log(`⏳ JS challenge, waiting 10s...`);
      await setTimeout(10000);
      
      // Retry
      const retry = await crawlHandle(send, kol.handle);
      if (retry && !retry.error) {
        const f = parseNum(retry.followers);
        const t = parseNum(retry.tweets);
        const d = parseDate(retry.lastTweet);
        if (f) kol.followers = f;
        if (t) kol.tweetCount = t;
        if (d) kol.lastTweetDate = d;
        kol.lastAudit = '2026-03-03';
        results.push({ handle: kol.handle, ok: true, followers: f || kol.followers, tweets: t || kol.tweetCount, lastTweet: d, category: kol.category, cluster: kol.cluster });
        success++;
        console.log(`✅ (retry) F:${f||'-'} T:${t||'-'} D:${d||'-'}`);
      } else {
        results.push({ handle: kol.handle, ok: false, followers: kol.followers, tweets: kol.tweetCount, category: kol.category, cluster: kol.cluster });
        failed++;
        console.log(`❌ (challenge persists)`);
      }
    } else if (data && !data.error) {
      challengeRetries = 0;
      const f = parseNum(data.followers);
      const t = parseNum(data.tweets);
      const d = parseDate(data.lastTweet);
      if (f) kol.followers = f;
      if (t) kol.tweetCount = t;
      if (d) kol.lastTweetDate = d;
      kol.lastAudit = '2026-03-03';
      results.push({ handle: kol.handle, ok: true, followers: f || kol.followers, tweets: t || kol.tweetCount, lastTweet: d, category: kol.category, cluster: kol.cluster });
      success++;
      console.log(`✅ F:${f||'-'} T:${t||'-'} D:${d||'-'}`);
    } else {
      results.push({ handle: kol.handle, ok: false, followers: kol.followers, tweets: kol.tweetCount, category: kol.category, cluster: kol.cluster });
      failed++;
      console.log(`❌`);
    }
    
    // Save every 20
    if (i % 20 === 19) {
      writeFileSync(KOL_PATH, JSON.stringify(kols, null, 2));
      console.log(`  [saved progress]`);
    }
    
    // 5-8 second delay
    await setTimeout(5000 + Math.random() * 3000);
  }
  
  // Final save
  writeFileSync(KOL_PATH, JSON.stringify(kols, null, 2));
  
  // Generate report
  const okR = results.filter(r => r.ok).sort((a, b) => (b.followers||0) - (a.followers||0));
  const recent = okR.filter(r => r.lastTweet && r.lastTweet >= '2026-02-24');
  
  let report = `# KOL Audit Report — 2026-03-03\n\n`;
  report += `**Crawled:** ${new Date().toISOString()}\n**Total:** ${kols.length} | **Fresh data:** ${success} | **Failed:** ${failed}\n\n`;
  
  report += `## Top 20 by Followers\n\n| # | Handle | Followers | Tweets | Last Tweet | Category |\n|---|--------|-----------|--------|------------|----------|\n`;
  okR.slice(0, 20).forEach((r, i) => {
    report += `| ${i+1} | @${r.handle} | ${(r.followers||0).toLocaleString()} | ${(r.tweets||0).toLocaleString()} | ${r.lastTweet||'N/A'} | ${r.category||'-'} |\n`;
  });
  
  report += `\n## Active Last 7 Days (${recent.length})\n\n| Handle | Followers | Last Tweet | Category |\n|--------|-----------|------------|----------|\n`;
  recent.forEach(r => {
    report += `| @${r.handle} | ${(r.followers||0).toLocaleString()} | ${r.lastTweet} | ${r.category||'-'} |\n`;
  });
  if (recent.length === 0) report += `| (none detected) | - | - | - |\n`;
  
  const failedR = results.filter(r => !r.ok);
  if (failedR.length > 0) {
    report += `\n## Failed to Crawl (${failedR.length})\n\n`;
    failedR.forEach(r => report += `- @${r.handle} (cached: ${(r.followers||0).toLocaleString()} followers)\n`);
  }
  
  report += `\n## Complete List\n\n| Handle | ✓ | Followers | Tweets | Last Tweet | Cluster |\n|--------|---|-----------|--------|------------|--------|\n`;
  results.sort((a, b) => (b.followers||0) - (a.followers||0)).forEach(r => {
    report += `| @${r.handle} | ${r.ok?'✅':'⚠️'} | ${(r.followers||0).toLocaleString()} | ${(r.tweets||0).toLocaleString()} | ${r.lastTweet||'N/A'} | ${r.cluster||'-'} |\n`;
  });
  
  writeFileSync(REPORT_PATH, report);
  ws.close();
  console.log(`\n===DONE=== Success:${success} Failed:${failed} Recent:${recent.length}`);
}

main().catch(console.error);
