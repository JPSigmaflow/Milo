#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';

const config = JSON.parse(readFileSync('/Users/milo/.openclaw/workspace/shared/crypto-scanner/config.json', 'utf8'));

const AUTH_TOKEN = config.x.auth_token;
const CT0 = config.x.ct0;

const TOP_KOLS = [
  'vitalikbuterin', 'cz_binance', 'saylor', 'balajis', 'elonmusk',
  'APompliano', 'CathieDWood', 'CryptoHayes', 'aantonop', 'documenting btc',
  'zhusu', 'hasufl', 'cobie', 'pentoshi', 'GCRClassic',
  'DegenSpartan', 'HsakaTrades', 'MacroScope17', 'TaikiMaeda2', 'Pentosh1'
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getUserByScreenName(username) {
  const url = `https://x.com/i/api/graphql/qRednkZG-rK146YdZ94vcw/UserByScreenName?variables=${encodeURIComponent(JSON.stringify({
    screen_name: username,
    withSafetyModeUserFields: true
  }))}&features=${encodeURIComponent(JSON.stringify({
    hidden_profile_likes_enabled: false,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    subscriptions_verification_info_verified_since_enabled: true,
    highlights_tweets_tab_ui_enabled: true,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true
  }))}`;

  const response = await fetch(url, {
    headers: {
      'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
      'x-auth-type': 'OAuth2Session',
      'x-csrf-token': CT0,
      'cookie': `auth_token=${AUTH_TOKEN}; ct0=${CT0};`,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    if (response.status === 429) {
      console.log('Rate limited, stopping...');
      return null;
    }
    console.log(`Error fetching ${username}: ${response.status}`);
    return null;
  }

  const data = await response.json();
  return data?.data?.user?.result;
}

async function getFollowing(userId, maxCount = 50) {
  const url = `https://x.com/i/api/graphql/iSicc7LrzWGBgDPL0tM_TQ/Following?variables=${encodeURIComponent(JSON.stringify({
    userId: userId,
    count: maxCount,
    includePromotedContent: false
  }))}&features=${encodeURIComponent(JSON.stringify({
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
  }))}`;

  const response = await fetch(url, {
    headers: {
      'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
      'x-auth-type': 'OAuth2Session',
      'x-csrf-token': CT0,
      'cookie': `auth_token=${AUTH_TOKEN}; ct0=${CT0};`,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    if (response.status === 429) {
      console.log('Rate limited on following fetch');
      return [];
    }
    return [];
  }

  const data = await response.json();
  const instructions = data?.data?.user?.result?.timeline?.timeline?.instructions || [];
  
  const following = [];
  for (const inst of instructions) {
    if (inst.type === 'TimelineAddEntries') {
      for (const entry of inst.entries || []) {
        if (entry.content?.itemContent?.user_results?.result) {
          const user = entry.content.itemContent.user_results.result;
          if (user.legacy) {
            following.push({
              screen_name: user.legacy.screen_name,
              followers_count: user.legacy.followers_count || 0,
              name: user.legacy.name
            });
          }
        }
      }
    }
  }
  
  return following;
}

async function main() {
  console.log('🔍 Starting KOL Network Audit...');
  
  const networkMap = {};
  const discoveredAccounts = {};
  
  // Sample top KOLs
  for (const username of TOP_KOLS.slice(0, 10)) {
    console.log(`\n📊 Fetching ${username}...`);
    
    const user = await getUserByScreenName(username);
    await sleep(2000);
    
    if (!user || !user.rest_id) {
      console.log(`  ❌ Failed to fetch ${username}`);
      continue;
    }
    
    const followers = user.legacy?.followers_count || 0;
    console.log(`  👤 ${user.legacy?.name} - ${followers.toLocaleString()} followers`);
    
    if (followers < 100000) {
      console.log(`  ⏭️  Skipping (< 100K followers)`);
      continue;
    }
    
    networkMap[username] = {
      name: user.legacy?.name,
      followers: followers,
      following: []
    };
    
    console.log(`  📡 Fetching following list...`);
    const following = await getFollowing(user.rest_id, 50);
    await sleep(2000);
    
    console.log(`  ✅ Found ${following.length} accounts`);
    
    for (const acc of following) {
      networkMap[username].following.push(acc.screen_name);
      
      // Track crypto accounts with >10K followers
      if (acc.followers_count >= 10000) {
        if (!discoveredAccounts[acc.screen_name]) {
          discoveredAccounts[acc.screen_name] = {
            name: acc.name,
            followers: acc.followers_count,
            followedBy: []
          };
        }
        discoveredAccounts[acc.screen_name].followedBy.push(username);
      }
    }
  }
  
  // Find high-signal accounts (followed by multiple top KOLs)
  const highSignal = Object.entries(discoveredAccounts)
    .filter(([_, data]) => data.followedBy.length >= 2)
    .sort((a, b) => b[1].followedBy.length - a[1].followedBy.length);
  
  console.log(`\n\n🎯 HIGH SIGNAL ACCOUNTS (followed by 2+ top KOLs):`);
  for (const [username, data] of highSignal.slice(0, 30)) {
    console.log(`  ${username} (${data.followers.toLocaleString()} followers)`);
    console.log(`    Followed by: ${data.followedBy.join(', ')}`);
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    networkMap,
    discoveredAccounts: Object.fromEntries(highSignal.slice(0, 50)),
    stats: {
      kolsScanned: Object.keys(networkMap).length,
      accountsDiscovered: Object.keys(discoveredAccounts).length,
      highSignalAccounts: highSignal.length
    }
  };
  
  writeFileSync(
    '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-network-report-2026-03-05.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n✅ Report saved!');
  return report;
}

main().catch(console.error);
