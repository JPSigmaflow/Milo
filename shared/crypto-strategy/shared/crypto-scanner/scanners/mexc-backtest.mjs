#!/usr/bin/env node
/**
 * MEXC Listing Backtest
 * 
 * Tests our Multi-Path Detection System against REAL MEXC listings.
 * Question: Would we have caught these tokens at Day 1?
 */

import { checkTikTok } from './lib/tiktok-checker.mjs';
import { checkReddit, checkCryptoSubreddits } from './lib/reddit-checker.mjs';
import { checkNaver, hasKoreanCharacters } from './lib/naver-checker.mjs';
import { checkGitHub } from './lib/github-checker.mjs';
import { checkTwitter } from './lib/twitter-checker.mjs';
import https from 'https';

// BiliBili check (inline for now)
function checkBiliBili(query) {
  return new Promise((resolve) => {
    const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(query)}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.bilibili.com'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.data?.result) {
            const videos = json.data.result;
            const totalViews = videos.reduce((sum, v) => sum + (v.play || 0), 0);
            resolve({ totalViews, videoCount: videos.length });
          } else {
            resolve({ totalViews: 0, videoCount: 0 });
          }
        } catch {
          resolve({ totalViews: 0, videoCount: 0 });
        }
      });
    }).on('error', () => resolve({ totalViews: 0, videoCount: 0 }));
  });
}

// Known MEXC Pump.fun listings (add more as we discover them!)
const MEXC_LISTINGS = [
  {
    name: '我的刀盾',
    englishName: 'What the dog doing',
    symbol: 'WTD',
    launchDate: '2025-02-25',
    mexcListDate: '2025-03-03',
    launchMC: 69000,
    mexcListMC: 2000000,
    pumpMultiple: 29,
    notes: 'Case study coin - had 1.3M BiliBili views BEFORE token'
  },
  {
    name: 'AI16Z',
    symbol: 'AI16Z',
    launchDate: '2024-10-20',
    mexcListDate: '2024-11-15',
    category: 'tech',
    notes: 'AI agent play - Marc Andreessen connection'
  },
  {
    name: 'FARTCOIN',
    symbol: 'FARTCOIN',
    launchDate: '2024-11-01',
    mexcListDate: '2024-11-25',
    category: 'meme',
    notes: 'Viral meme coin'
  },
  {
    name: 'GOAT',
    symbol: 'GOAT',
    launchDate: '2024-10-10',
    mexcListDate: '2024-10-28',
    category: 'meme',
    notes: 'AI-generated meme by Truth Terminal'
  },
  {
    name: 'PNUT',
    symbol: 'PNUT',
    launchDate: '2024-11-02',
    mexcListDate: '2024-11-14',
    category: 'meme',
    notes: 'Peanut the Squirrel - viral pet story'
  },
  {
    name: 'ACT',
    symbol: 'ACT',
    launchDate: '2024-10-19',
    mexcListDate: '2024-11-07',
    category: 'tech',
    notes: 'AI agent ecosystem token'
  },
  {
    name: 'MOODENG',
    symbol: 'MOODENG',
    launchDate: '2024-09-15',
    mexcListDate: '2024-10-03',
    category: 'meme',
    notes: 'Thai baby hippo - viral animal'
  },
  {
    name: 'POPCAT',
    symbol: 'POPCAT',
    launchDate: '2023-12-12',
    mexcListDate: '2024-08-05',
    category: 'meme',
    notes: 'Cat meme - TikTok/YouTube viral'
  },
  {
    name: 'WIF',
    englishName: 'dogwifhat',
    symbol: 'WIF',
    launchDate: '2023-11-20',
    mexcListDate: '2024-03-01',
    category: 'meme',
    notes: 'Dog with hat meme - Reddit/Twitter viral'
  },
  {
    name: 'BONK',
    symbol: 'BONK',
    launchDate: '2022-12-25',
    mexcListDate: '2023-01-15',
    category: 'meme',
    notes: 'Solana dog coin - community driven'
  }
];

async function evaluateCoin(coin) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 EVALUATING: ${coin.name} (${coin.symbol})`);
  console.log(`${'='.repeat(60)}`);
  
  console.log(`Launch Date: ${coin.launchDate}`);
  console.log(`MEXC List Date: ${coin.mexcListDate}`);
  if (coin.pumpMultiple) console.log(`Pump: ${coin.pumpMultiple}x`);
  console.log(`\nRunning Multi-Path Analysis...\n`);
  
  // Run all checks
  const [bili, tiktok, reddit, naver, github, twitter] = await Promise.all([
    checkBiliBili(coin.name),
    checkTikTok(coin.name),
    checkCryptoSubreddits(coin.name),
    checkNaver(coin.name),
    checkGitHub(coin.name),
    checkTwitter(coin.name)
  ]);
  
  let mexcScore = 0;
  const factors = [];
  
  // Score it!
  
  // 1. BiliBili (China)
  if (bili.totalViews > 5000000) {
    mexcScore += 6;
    factors.push(`🇨🇳 BiliBili: ${(bili.totalViews/1e6).toFixed(1)}M views`);
  } else if (bili.totalViews > 1000000) {
    mexcScore += 5;
    factors.push(`🇨🇳 BiliBili: ${(bili.totalViews/1e6).toFixed(1)}M views`);
  } else if (bili.totalViews > 500000) {
    mexcScore += 3;
    factors.push(`🇨🇳 BiliBili: ${(bili.totalViews/1e3).toFixed(0)}K views`);
  } else if (bili.totalViews > 100000) {
    mexcScore += 2;
    factors.push(`🇨🇳 BiliBili: ${(bili.totalViews/1e3).toFixed(0)}K views`);
  }
  
  // 2. TikTok (Global)
  if (tiktok.totalViews > 10000000) {
    mexcScore += 5;
    factors.push(`🌍 TikTok: ${(tiktok.totalViews/1e6).toFixed(1)}M views`);
  } else if (tiktok.totalViews > 1000000) {
    mexcScore += 3;
    factors.push(`🌍 TikTok: ${(tiktok.totalViews/1e6).toFixed(1)}M views`);
  } else if (tiktok.totalViews > 100000) {
    mexcScore += 2;
    factors.push(`🌍 TikTok: ${(tiktok.totalViews/1e3).toFixed(0)}K views`);
  }
  
  // 3. Reddit (USA/EU)
  if (reddit.totalUpvotes > 10000) {
    mexcScore += 4;
    factors.push(`🇺🇸 Reddit: ${(reddit.totalUpvotes/1e3).toFixed(1)}K upvotes`);
  } else if (reddit.totalUpvotes > 1000) {
    mexcScore += 2;
    factors.push(`🇺🇸 Reddit: ${reddit.totalUpvotes} upvotes`);
  }
  
  // 4. Naver (Korea)
  if (naver.totalMentions > 50) {
    mexcScore += 4;
    factors.push(`🇰🇷 Naver: ${naver.totalMentions} mentions`);
  } else if (naver.totalMentions > 20) {
    mexcScore += 2;
    factors.push(`🇰🇷 Naver: ${naver.totalMentions} mentions`);
  }
  
  // 5. GitHub (Tech)
  if (github.totalStars > 1000) {
    mexcScore += 4;
    factors.push(`💻 GitHub: ${github.totalStars} stars`);
  } else if (github.totalStars > 100) {
    mexcScore += 2;
    factors.push(`💻 GitHub: ${github.totalStars} stars`);
  }
  if (github.hasActiveRepo) {
    mexcScore += 1;
    factors.push(`💻 Active development`);
  }
  
  // 6. Twitter
  if (twitter.isTrending) {
    mexcScore += 3;
    factors.push(`🐦 Twitter trending (${twitter.tweetCount} tweets)`);
  } else if (twitter.tweetCount > 50) {
    mexcScore += 1;
    factors.push(`🐦 Twitter: ${twitter.tweetCount} tweets`);
  }
  
  // Regional signals
  const hasChinese = /[\u4e00-\u9fa5]/.test(coin.name + coin.symbol);
  if (hasChinese) {
    mexcScore += 2;
    factors.push(`🇨🇳 Chinese characters`);
  }
  
  if (hasKoreanCharacters(coin.name + coin.symbol)) {
    mexcScore += 2;
    factors.push(`🇰🇷 Korean characters`);
  }
  
  // Pump.fun ecosystem
  mexcScore += 2;
  factors.push(`🚀 Pump.fun ecosystem`);
  
  // Results
  console.log(`📊 MEXC SCORE: ${mexcScore}/30+`);
  console.log(`\nSignals Found:`);
  factors.forEach(f => console.log(`  ✓ ${f}`));
  
  console.log(`\n🎯 VERDICT:`);
  if (mexcScore >= 10) {
    console.log(`  ✅ STRONG CATCH - Would definitely flag this!`);
  } else if (mexcScore >= 7) {
    console.log(`  ⚠️  MODERATE CATCH - Would flag with medium priority`);
  } else if (mexcScore >= 5) {
    console.log(`  ⚡ WEAK CATCH - Might catch depending on other factors`);
  } else {
    console.log(`  ❌ MISS - Would NOT catch this with current system`);
  }
  
  // Raw data
  console.log(`\n📈 Raw Data:`);
  console.log(`  BiliBili: ${bili.totalViews.toLocaleString()} views (${bili.videoCount} videos)`);
  console.log(`  TikTok: ${tiktok.totalViews.toLocaleString()} views (${tiktok.videoCount} videos)`);
  console.log(`  Reddit: ${reddit.totalUpvotes.toLocaleString()} upvotes (${reddit.postCount} posts)`);
  console.log(`  Naver: ${naver.totalMentions} total mentions`);
  console.log(`  GitHub: ${github.totalStars} stars (${github.repoCount} repos)`);
  console.log(`  Twitter: ${twitter.tweetCount} tweets`);
  
  return { coin, mexcScore, factors, bili, tiktok, reddit, naver, github, twitter };
}

async function runBacktest() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║        MEXC LISTING BACKTEST - Multi-Path System          ║
║  Testing: Would we have caught real MEXC listings?       ║
╚═══════════════════════════════════════════════════════════╝
`);
  
  const results = [];
  
  for (const coin of MEXC_LISTINGS) {
    const result = await evaluateCoin(coin);
    results.push(result);
    
    // Rate limit (be nice to APIs)
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Summary
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`📊 BACKTEST SUMMARY`);
  console.log(`${'='.repeat(60)}\n`);
  
  const strongCatches = results.filter(r => r.mexcScore >= 10).length;
  const moderateCatches = results.filter(r => r.mexcScore >= 7 && r.mexcScore < 10).length;
  const weakCatches = results.filter(r => r.mexcScore >= 5 && r.mexcScore < 7).length;
  const misses = results.filter(r => r.mexcScore < 5).length;
  
  console.log(`Total MEXC Listings Tested: ${results.length}`);
  console.log(`\nResults:`);
  console.log(`  ✅ Strong Catches (≥10):     ${strongCatches} (${(strongCatches/results.length*100).toFixed(0)}%)`);
  console.log(`  ⚠️  Moderate Catches (7-9):  ${moderateCatches} (${(moderateCatches/results.length*100).toFixed(0)}%)`);
  console.log(`  ⚡ Weak Catches (5-6):       ${weakCatches} (${(weakCatches/results.length*100).toFixed(0)}%)`);
  console.log(`  ❌ Misses (<5):              ${misses} (${(misses/results.length*100).toFixed(0)}%)`);
  
  const catchRate = ((strongCatches + moderateCatches) / results.length * 100).toFixed(0);
  console.log(`\n🎯 CATCH RATE (≥7 score): ${catchRate}%`);
  
  console.log(`\n💡 Top Performing Signals:`);
  const allFactors = results.flatMap(r => r.factors);
  const factorCounts = {};
  allFactors.forEach(f => {
    const key = f.split(':')[0].trim();
    factorCounts[key] = (factorCounts[key] || 0) + 1;
  });
  
  Object.entries(factorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([factor, count]) => {
      console.log(`  ${factor}: ${count}/${results.length} coins`);
    });
}

runBacktest().catch(console.error);
