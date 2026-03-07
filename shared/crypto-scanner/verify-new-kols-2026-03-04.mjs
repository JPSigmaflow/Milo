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

// Candidates from web search
const CANDIDATES = [
  'SmartContracter',
  'MMCrypto',
  'meltemdemirors',
  'ElizabethStark',
  'KathrynHaun',
  'TheTradingParrot',
  'TraderSZ',
  'intocryptoverse',
  'Blockchaincap',
  'adam3us',
  'MrDavidMorton',
  'CryptoCred',
  'AltcoinSherpa', // already in config, verify
  'CryptoKaleo', // already in config, verify
  'TheCryptoDog', // already in config, verify
];

async function getUserData(username) {
  try {
    const url = `https://x.com/i/api/graphql/qW5u-DAuXpMEG0zA1F7UGQ/UserByScreenName?variables=${encodeURIComponent(JSON.stringify({screen_name:username,withSafetyModeUserFields:true}))}&features=${encodeURIComponent(JSON.stringify({hidden_profile_likes_enabled:true,responsive_web_graphql_exclude_directive_enabled:true}))}`;
    
    const res = await fetch(url, { headers });
    if (res.status === 429) {
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
      bio: user.legacy.description
    };
  } catch (e) {
    return { status: 'error', username, error: e.message };
  }
}

async function main() {
  console.log('🔍 Verifying new KOL candidates...\n');
  
  const results = {
    qualified: [],
    tooSmall: [],
    dead: [],
    errors: []
  };
  
  for (const username of CANDIDATES) {
    const data = await getUserData(username);
    
    if (data.status === 'rate_limited') {
      console.log('⚠️  Hit rate limit, stopping');
      break;
    }
    
    if (data.status === 'dead') {
      console.log(`❌ ${username} - unavailable`);
      results.dead.push(username);
    } else if (data.status === 'error') {
      console.log(`⚠️  ${username} - error`);
      results.errors.push(data);
    } else {
      const k = data.followers / 1000;
      
      if (data.followers >= 50000) {
        console.log(`✅ ${data.username} - ${k.toFixed(0)}K followers`);
        console.log(`   Bio: ${data.bio.substring(0, 80)}...`);
        results.qualified.push(data);
      } else if (data.followers >= 10000) {
        console.log(`⚠️  ${data.username} - ${k.toFixed(1)}K followers (above 10K but below 50K)`);
        results.qualified.push(data); // Still include, just flag
      } else {
        console.log(`❌ ${data.username} - only ${k.toFixed(1)}K followers`);
        results.tooSmall.push(data);
      }
    }
    
    await sleep(1500);
  }
  
  // Save results
  const reportPath = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/new-kols-verified-2026-03-04.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  console.log(`\n✅ Verification complete!`);
  console.log(`\n📊 Results:`);
  console.log(`- Qualified: ${results.qualified.length}`);
  console.log(`- Too small: ${results.tooSmall.length}`);
  console.log(`- Dead: ${results.dead.length}`);
  console.log(`- Errors: ${results.errors.length}`);
  console.log(`\n💾 Report saved: ${reportPath}`);
}

main().catch(console.error);
