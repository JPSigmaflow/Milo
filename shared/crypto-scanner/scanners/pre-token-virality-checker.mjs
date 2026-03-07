#!/usr/bin/env node
/**
 * Pre-Token Virality Checker
 * 
 * Checks if the TOKEN NAME/NARRATIVE already has traction BEFORE the token launched.
 * This is the key signal for MEXC listing potential.
 */

import https from 'https';

// Check BiliBili for content about the name/meme
async function checkBiliBili(query) {
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
            const videosBeforeToken = videos.length; // Simplified - would need date filtering
            
            resolve({
              found: videos.length > 0,
              totalViews,
              videoCount: videosBeforeToken,
              signal: totalViews > 500000 ? 'STRONG' : totalViews > 100000 ? 'MEDIUM' : 'WEAK'
            });
          } else {
            resolve({ found: false, totalViews: 0, videoCount: 0, signal: 'NONE' });
          }
        } catch (e) {
          resolve({ found: false, totalViews: 0, videoCount: 0, signal: 'NONE' });
        }
      });
    }).on('error', () => resolve({ found: false, totalViews: 0, videoCount: 0, signal: 'NONE' }));
  });
}

// Check if name has Wikipedia/KnowYourMeme entry
async function checkEstablishedMeme(query) {
  // Simplified check - just search for the term
  // In production: actual Wikipedia/KYM API
  return {
    hasWikipedia: false, // Would need actual check
    hasKnowYourMeme: false,
    established: false
  };
}

// Main function
async function checkPreTokenVirality(tokenName, tokenSymbol) {
  console.log(`\n🔍 PRE-TOKEN VIRALITY CHECK: ${tokenName} (${tokenSymbol})\n`);
  
  // Check BiliBili
  console.log('Checking BiliBili...');
  const bili = await checkBiliBili(tokenName);
  console.log(`  Videos: ${bili.videoCount}`);
  console.log(`  Total Views: ${(bili.totalViews / 1e6).toFixed(2)}M`);
  console.log(`  Signal: ${bili.signal}`);
  
  // Check established meme status
  console.log('\nChecking Meme Status...');
  const meme = await checkEstablishedMeme(tokenName);
  console.log(`  Wikipedia: ${meme.hasWikipedia ? 'YES' : 'NO'}`);
  console.log(`  KnowYourMeme: ${meme.hasKnowYourMeme ? 'YES' : 'NO'}`);
  
  // Calculate MEXC listing probability
  let mexcScore = 0;
  const factors = [];
  
  if (bili.signal === 'STRONG') {
    mexcScore += 5;
    factors.push(`BiliBili ${(bili.totalViews/1e6).toFixed(1)}M views: +5`);
  } else if (bili.signal === 'MEDIUM') {
    mexcScore += 3;
    factors.push(`BiliBili ${(bili.totalViews/1e3).toFixed(0)}K views: +3`);
  }
  
  if (meme.hasWikipedia) {
    mexcScore += 2;
    factors.push('Wikipedia entry: +2');
  }
  
  if (meme.hasKnowYourMeme) {
    mexcScore += 2;
    factors.push('KnowYourMeme entry: +2');
  }
  
  const hasChinese = /[\u4e00-\u9fa5]/.test(tokenName + tokenSymbol);
  if (hasChinese) {
    mexcScore += 3;
    factors.push('Chinese characters: +3');
  }
  
  console.log('\n📊 MEXC LISTING PROBABILITY\n');
  console.log(`Score: ${mexcScore}/12`);
  factors.forEach(f => console.log(`  ${f}`));
  
  if (mexcScore >= 8) {
    console.log('\n🚨 HIGH PROBABILITY - MEXC listing likely in 3-7 days!');
  } else if (mexcScore >= 5) {
    console.log('\n⚠️ MEDIUM PROBABILITY - Watch for momentum');
  } else {
    console.log('\n✓ LOW PROBABILITY - Standard pump.fun token');
  }
  
  return {
    mexcScore,
    factors,
    bili,
    meme
  };
}

// Test with 我的刀盾
if (process.argv[2]) {
  const name = process.argv[2];
  const symbol = process.argv[3] || name;
  checkPreTokenVirality(name, symbol);
} else {
  // Default test
  checkPreTokenVirality('what the dog doing', '我的刀盾');
}
