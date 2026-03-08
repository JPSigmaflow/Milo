#!/usr/bin/env node
import fs from 'fs';
import { setTimeout as sleep } from 'timers/promises';

const AUTH_TOKEN = '9a90162cad8ecbe888dc05d97af9fc40c5fbe1bf';
const CT0 = 'f17ab672a1e8016cbaca3c2a92b401166fefd61673940cee886678b5c386b481dfedba1be2ef49d34b09c33c0502489d9a403b9f1f7b4aa0bd1de24552c6b9e34a3258e3e09bd3162aeaa5c97a7d2052';
const BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

const headers = {
  'authorization': `Bearer ${BEARER}`,
  'x-csrf-token': CT0,
  'cookie': `auth_token=${AUTH_TOKEN}; ct0=${CT0}`,
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'x-twitter-auth-type': 'OAuth2Session',
  'x-twitter-active-user': 'yes',
  'x-twitter-client-language': 'en'
};

async function getUserData(username) {
  try {
    const url = `https://x.com/i/api/graphql/qW5u-DAuXpMEG0zA1F7UGQ/UserByScreenName?variables=${encodeURIComponent(JSON.stringify({screen_name:username,withSafetyModeUserFields:true}))}&features=${encodeURIComponent(JSON.stringify({hidden_profile_likes_enabled:true,responsive_web_graphql_exclude_directive_enabled:true}))}`;
    
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      console.log('⚠️  Rate limited');
      return { status: 'rate_limited' };
    }
    
    const data = await res.json();
    const user = data?.data?.user?.result;
    
    if (!user || user.__typename === 'UserUnavailable') {
      return { status: 'dead', username };
    }
    
    return {
      status: 'alive',
      username: user.legacy.screen_name,
      followers: user.legacy.followers_count,
      following: user.legacy.friends_count,
      tweets: user.legacy.statuses_count,
      verified: user.is_blue_verified || user.legacy.verified,
      created: user.legacy.created_at
    };
  } catch (e) {
    return { status: 'error', username, error: e.message };
  }
}

async function main() {
  console.log('🔍 KOL Audit - March 4, 2026\n');
  
  // Read current config
  const config = JSON.parse(fs.readFileSync('/Users/milo/.openclaw/workspace/shared/crypto-scanner/config.json', 'utf8'));
  const allAccounts = config.x.accounts;
  
  console.log(`📊 Total accounts in config: ${allAccounts.length}\n`);
  
  // Random sample of 50 accounts
  const sample = [];
  const sampleSize = Math.min(50, allAccounts.length);
  const step = Math.floor(allAccounts.length / sampleSize);
  
  for (let i = 0; i < allAccounts.length; i += step) {
    sample.push(allAccounts[i]);
    if (sample.length >= sampleSize) break;
  }
  
  console.log(`🎯 Auditing ${sample.length} accounts...\n`);
  
  const results = {
    alive: [],
    dead: [],
    smallFollowers: [], // <10K
    errors: []
  };
  
  for (const username of sample) {
    const data = await getUserData(username);
    
    if (data.status === 'rate_limited') {
      console.log('⚠️  Hit rate limit, stopping audit');
      break;
    }
    
    if (data.status === 'dead') {
      console.log(`❌ ${username} - suspended/deleted`);
      results.dead.push(username);
    } else if (data.status === 'error') {
      console.log(`⚠️  ${username} - error: ${data.error}`);
      results.errors.push(data);
    } else {
      if (data.followers < 10000) {
        console.log(`⚠️  ${username} - only ${(data.followers/1000).toFixed(1)}K followers`);
        results.smallFollowers.push(data);
      } else {
        console.log(`✓ ${username} - ${(data.followers/1000).toFixed(0)}K followers, ${data.tweets} tweets`);
        results.alive.push(data);
      }
    }
    
    await sleep(1200); // Rate limiting
  }
  
  // Save audit report
  const reportPath = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/audit-report-2026-03-04.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalInConfig: allAccounts.length,
    sampleSize: sample.length,
    alive: results.alive.length,
    dead: results.dead.length,
    smallFollowers: results.smallFollowers.length,
    deadAccounts: results.dead,
    smallFollowerAccounts: results.smallFollowers,
    errors: results.errors
  }, null, 2));
  
  console.log(`\n✅ Audit complete!`);
  console.log(`\n📊 Results:`);
  console.log(`- Alive & healthy: ${results.alive.length}`);
  console.log(`- Dead/suspended: ${results.dead.length}`);
  console.log(`- Small followers (<10K): ${results.smallFollowers.length}`);
  console.log(`- Errors: ${results.errors.length}`);
  console.log(`\n💾 Report saved: ${reportPath}`);
  
  return results;
}

main().catch(console.error);
