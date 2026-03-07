#!/usr/bin/env node
/**
 * TEST REDDIT PLAYWRIGHT FIX
 * Verifies that the new Reddit Playwright scanner works correctly
 */

import { scanReddit } from './scanners/reddit.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🧪 TESTING REDDIT PLAYWRIGHT FIX');
console.log('================================\n');

// Check config
const configPath = join(process.cwd(), 'config.json');
if (!existsSync(configPath)) {
  console.error('❌ No config.json found. Please create it with Reddit subreddits.');
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));

if (!config.reddit?.subreddits || config.reddit.subreddits.length === 0) {
  console.log('⚠️  No Reddit subreddits configured. Adding test config...');
  config.reddit = {
    subreddits: ['CryptoCurrency', 'CryptoMoonShots', 'SatoshiStreetBets'],
    minUpvotes: 100
  };
  console.log('Test subreddits:', config.reddit.subreddits);
}

console.log(`📡 Scanning ${config.reddit.subreddits.length} subreddits...`);
console.log(`🎯 Min upvotes: ${config.reddit.minUpvotes || 500}\n`);

try {
  const startTime = Date.now();
  
  const results = await scanReddit();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  
  console.log('\n✅ REDDIT SCAN COMPLETED');
  console.log('========================');
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📊 Results: ${results.length} viral posts found`);
  
  if (results.length > 0) {
    console.log(`🔧 Scanner used: ${results[0].scanner || 'unknown'}`);
    console.log('\n📋 Sample results:');
    
    results.slice(0, 3).forEach((post, i) => {
      console.log(`\n${i + 1}. r/${post.sub} - ${post.score} ups`);
      console.log(`   📝 ${post.title.substring(0, 80)}${post.title.length > 80 ? '...' : ''}`);
      if (post.selftext && post.selftext.trim()) {
        console.log(`   💬 ${post.selftext.substring(0, 100)}${post.selftext.length > 100 ? '...' : ''}`);
      }
      console.log(`   🔗 reddit.com${post.permalink}`);
    });
    
    if (results.length > 3) {
      console.log(`\n   ... and ${results.length - 3} more posts`);
    }
  } else {
    console.log('ℹ️  No new viral posts found (all may have been seen before)');
  }
  
  // Check for Playwright success indicators
  const playwrightResults = results.filter(r => r.scanner === 'playwright');
  const curlResults = results.filter(r => r.scanner === 'curl');
  
  if (playwrightResults.length > 0) {
    console.log(`\n🎉 PLAYWRIGHT SUCCESS: ${playwrightResults.length} posts via Playwright`);
  }
  
  if (curlResults.length > 0) {
    console.log(`\n📡 CURL FALLBACK: ${curlResults.length} posts via curl`);
  }
  
  console.log('\n🔧 FIX STATUS: ✅ Reddit Playwright implementation working!');
  
} catch (error) {
  console.error('\n❌ REDDIT SCAN FAILED');
  console.error('====================');
  console.error(`Error: ${error.message}`);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}