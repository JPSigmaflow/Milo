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

// Known high-follower KOLs to start with
const TOP_KOLS = [
  'VitalikButerin', 'elonmusk', 'cz_binance', 'balajis', 'APompliano',
  'brian_armstrong', 'ChainLinkGod', 'aantonop', 'saylor', 'CathieDWood',
  'hasufl', 'TaschaLabs', 'cburniske', 'RaoulGMI', 'GCRClassic',
  'cobie', 'DefiSurfer808', 'DegenSpartan', 'Pentoshi', 'CryptoHayes'
];

const results = {
  network: {},
  topFollowers: new Map(),
  newAccounts: [],
  deadAccounts: [],
  errors: []
};

async function getUserId(username) {
  try {
    const url = `https://x.com/i/api/graphql/qW5u-DAuXpMEG0zA1F7UGQ/UserByScreenName?variables=${encodeURIComponent(JSON.stringify({screen_name:username,withSafetyModeUserFields:true}))}&features=${encodeURIComponent(JSON.stringify({hidden_profile_likes_enabled:true,responsive_web_graphql_exclude_directive_enabled:true}))}`;
    
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      console.log('⚠️  Rate limited, pausing...');
      return null;
    }
    
    const data = await res.json();
    const user = data?.data?.user?.result;
    
    if (!user || user.__typename === 'UserUnavailable') {
      console.log(`❌ ${username} unavailable/suspended`);
      results.deadAccounts.push(username);
      return null;
    }
    
    return {
      id: user.rest_id,
      username: user.legacy.screen_name,
      followers: user.legacy.followers_count,
      following: user.legacy.friends_count
    };
  } catch (e) {
    console.error(`Error fetching ${username}:`, e.message);
    results.errors.push({username, error: e.message});
    return null;
  }
}

async function getFollowing(userId, username, limit = 50) {
  try {
    const vars = {
      userId,
      count: limit,
      includePromotedContent: false
    };
    
    const features = {
      rweb_lists_timeline_redesign_enabled: true,
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_timeline_navigation_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      tweetypie_unmention_optimization_enabled: true,
      responsive_web_edit_tweet_api_enabled: true,
      graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
      view_counts_everywhere_api_enabled: true,
      longform_notetweets_consumption_enabled: true,
      responsive_web_twitter_article_tweet_consumption_enabled: false,
      tweet_awards_web_tipping_enabled: false,
      freedom_of_speech_not_reach_fetch_enabled: true,
      standardized_nudges_misinfo: true,
      tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
      longform_notetweets_rich_text_read_enabled: true,
      longform_notetweets_inline_media_enabled: true,
      responsive_web_media_download_video_enabled: false,
      responsive_web_enhance_cards_enabled: false
    };
    
    const url = `https://x.com/i/api/graphql/PAnE9toFvlGiABjiJEDWxg/Following?variables=${encodeURIComponent(JSON.stringify(vars))}&features=${encodeURIComponent(JSON.stringify(features))}`;
    
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      console.log(`⚠️  Rate limited on ${username} following`);
      return [];
    }
    
    const data = await res.json();
    const instructions = data?.data?.user?.result?.timeline?.timeline?.instructions || [];
    
    const entries = instructions
      .find(i => i.type === 'TimelineAddEntries')
      ?.entries || [];
    
    const following = [];
    for (const entry of entries) {
      if (entry.entryId?.startsWith('user-')) {
        const userResult = entry.content?.itemContent?.user_results?.result;
        if (userResult?.legacy) {
          following.push({
            id: userResult.rest_id,
            username: userResult.legacy.screen_name,
            followers: userResult.legacy.followers_count
          });
        }
      }
    }
    
    console.log(`✓ ${username} follows ${following.length} accounts`);
    return following;
  } catch (e) {
    console.error(`Error fetching following for ${username}:`, e.message);
    results.errors.push({username, error: e.message});
    return [];
  }
}

async function main() {
  console.log('🔍 Starting KOL Network Audit...\n');
  
  // Step 1: Get TOP KOL data
  console.log('📊 Fetching TOP KOL profiles...');
  const topKolData = [];
  
  for (const username of TOP_KOLS) {
    const user = await getUserId(username);
    if (user && user.followers > 100000) {
      topKolData.push(user);
      console.log(`✓ ${user.username}: ${(user.followers/1000).toFixed(0)}K followers`);
    }
    await sleep(1500); // Rate limiting
  }
  
  console.log(`\n✓ Found ${topKolData.length} top KOLs with >100K followers\n`);
  
  // Step 2: Get their following lists
  console.log('🕸️  Building network map...');
  
  for (const kol of topKolData.slice(0, 15)) { // Limit to 15 to avoid rate limits
    const following = await getFollowing(kol.id, kol.username, 50);
    results.network[kol.username] = following;
    
    // Track who is followed by multiple top KOLs
    for (const account of following) {
      if (!results.topFollowers.has(account.username)) {
        results.topFollowers.set(account.username, {
          followers: account.followers,
          followedBy: []
        });
      }
      results.topFollowers.get(account.username).followedBy.push(kol.username);
    }
    
    await sleep(2000); // Rate limiting
  }
  
  // Step 3: Find high-value accounts (followed by 2+ top KOLs)
  console.log('\n🎯 Finding high-value accounts...');
  
  const highValueAccounts = [];
  for (const [username, data] of results.topFollowers.entries()) {
    if (data.followedBy.length >= 2 && data.followers > 10000) {
      highValueAccounts.push({
        username,
        followers: data.followers,
        followedBy: data.followedBy
      });
    }
  }
  
  highValueAccounts.sort((a, b) => b.followedBy.length - a.followedBy.length || b.followers - a.followers);
  
  console.log(`✓ Found ${highValueAccounts.length} high-value accounts\n`);
  
  // Step 4: Verify top candidates
  console.log('🔬 Verifying top candidates...');
  
  for (const account of highValueAccounts.slice(0, 20)) {
    const verified = await getUserId(account.username);
    if (verified && verified.followers > 10000) {
      results.newAccounts.push({
        ...account,
        verified: true,
        currentFollowers: verified.followers
      });
      console.log(`✓ ${account.username}: ${(verified.followers/1000).toFixed(0)}K (followed by ${account.followedBy.length} top KOLs)`);
    }
    await sleep(1500);
  }
  
  // Save results
  const reportPath = '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-network-report-2026-03-04.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    topKols: topKolData.length,
    networkSize: Object.keys(results.network).length,
    highValueAccounts: highValueAccounts.slice(0, 50),
    newAccountsVerified: results.newAccounts,
    deadAccounts: results.deadAccounts,
    errors: results.errors
  }, null, 2));
  
  console.log(`\n✅ Report saved to: ${reportPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`- Analyzed ${topKolData.length} top KOLs`);
  console.log(`- Found ${highValueAccounts.length} high-value accounts`);
  console.log(`- Verified ${results.newAccounts.length} new accounts`);
  console.log(`- Dead/suspended: ${results.deadAccounts.length}`);
}

main().catch(console.error);
