#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';

const TOP_KOLS = [
  'vitalikbuterin', 'cz_binance', 'saylor', 'balajis', 
  'APompliano', 'CathieDWood', 'CryptoHayes', 'aantonop', 'documentingbtc',
  'zhusu', 'hasufl', 'cobie', 'pentoshi', 'GCRClassic',
  'DegenSpartan', 'HsakaTrades', 'MacroScope17', 'TaikiMaeda2'
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getKOLData(handle) {
  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}`;
  
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });
    
    if (!resp.ok) {
      console.log(`  ❌ ${handle}: HTTP ${resp.status}`);
      return null;
    }
    
    const html = await resp.text();
    
    // Extract followers
    const followersMatch = html.match(/(\d[\d,\.]*)\s*Followers/i) || html.match(/"followers_count":(\d+)/);
    const followers = followersMatch ? parseInt(followersMatch[1].replace(/[,\.]/g, '')) : null;
    
    // Extract following count
    const followingMatch = html.match(/(\d[\d,\.]*)\s*Following/i) || html.match(/"friends_count":(\d+)/);
    const following = followingMatch ? parseInt(followingMatch[1].replace(/[,\.]/g, '')) : null;
    
    // Extract name
    const nameMatch = html.match(/"name":"([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : handle;
    
    // Extract recent tweets to find mentioned accounts
    const mentionedAccounts = new Set();
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(html)) !== null) {
      const mentioned = match[1].toLowerCase();
      if (mentioned !== handle.toLowerCase()) {
        mentionedAccounts.add(mentioned);
      }
    }
    
    return {
      handle,
      name,
      followers: followers || 0,
      following: following || 0,
      mentionedAccounts: Array.from(mentionedAccounts).slice(0, 30)
    };
    
  } catch (err) {
    console.log(`  ❌ ${handle}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('🔍 KOL Network Audit (Syndication API)\n');
  
  const results = [];
  const allMentioned = {};
  
  for (const handle of TOP_KOLS) {
    console.log(`📊 Fetching @${handle}...`);
    
    const data = await getKOLData(handle);
    await sleep(3000); // 3s delay between requests
    
    if (!data) continue;
    
    console.log(`  ✅ ${data.name} - ${data.followers.toLocaleString()} followers`);
    console.log(`  🔗 ${data.mentionedAccounts.length} accounts mentioned`);
    
    results.push(data);
    
    // Track mentioned accounts
    for (const mentioned of data.mentionedAccounts) {
      if (!allMentioned[mentioned]) {
        allMentioned[mentioned] = {
          mentionedBy: [],
          count: 0
        };
      }
      allMentioned[mentioned].mentionedBy.push(handle);
      allMentioned[mentioned].count++;
    }
  }
  
  // Find high-signal accounts (mentioned by multiple top KOLs)
  const highSignal = Object.entries(allMentioned)
    .filter(([_, data]) => data.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 50);
  
  console.log(`\n\n🎯 HIGH SIGNAL ACCOUNTS (mentioned by 2+ KOLs):\n`);
  for (const [handle, data] of highSignal.slice(0, 20)) {
    console.log(`  @${handle} (mentioned ${data.count}x)`);
    console.log(`    By: ${data.mentionedBy.join(', ')}`);
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    method: 'syndication-api',
    kolsScanned: results.length,
    results,
    highSignalAccounts: highSignal.map(([handle, data]) => ({
      handle,
      mentionCount: data.count,
      mentionedBy: data.mentionedBy
    })),
    stats: {
      totalKOLs: results.length,
      totalMentionedAccounts: Object.keys(allMentioned).length,
      highSignalAccounts: highSignal.length
    }
  };
  
  const outPath = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-network-report-2026-03-05-syndication.json';
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  
  console.log(`\n✅ Report saved: ${outPath}`);
  
  return report;
}

main().catch(console.error);
