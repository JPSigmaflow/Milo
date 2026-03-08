#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { setTimeout } from 'timers/promises';

const config = JSON.parse(readFileSync(process.env.HOME + '/.openclaw/workspace/shared/crypto-scanner/config.json', 'utf8'));
const cookies = JSON.parse(readFileSync(process.env.HOME + '/.openclaw/workspace/shared/crypto-scanner/x-cookies.json', 'utf8'));

const BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const RATE_LIMIT_DELAY = 1500; // 1.5 sec between calls

const results = {
  networkMap: {},
  topKOLs: [],
  newCandidates: [],
  auditResults: [],
  removedAccounts: [],
  timestamp: new Date().toISOString()
};

// GraphQL query IDs
const USER_BY_SCREEN_NAME = 'G3KGOASz96M-Qu0nwmGXNg';
const FOLLOWING_QUERY = 'PAnE9toFvlGiABjiJEDWxg';

async function fetchUser(username) {
  const variables = {
    screen_name: username,
    withSafetyModeUserFields: true
  };
  
  const features = {
    hidden_profile_subscriptions_enabled: true,
    rweb_tipjar_consumption_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    subscriptions_verification_info_is_identity_verified_enabled: true,
    subscriptions_verification_info_verified_since_enabled: true,
    highlights_tweets_tab_ui_enabled: true,
    responsive_web_twitter_article_notes_tab_enabled: true,
    subscriptions_feature_can_gift_premium: true,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true
  };

  const url = `https://x.com/i/api/graphql/${USER_BY_SCREEN_NAME}/UserByScreenName?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`;

  try {
    const response = await fetch(url, {
      headers: {
        'authorization': `Bearer ${BEARER}`,
        'cookie': `auth_token=${cookies.auth_token}; ct0=${cookies.ct0}`,
        'x-csrf-token': cookies.ct0,
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-active-user': 'yes',
        'x-twitter-client-language': 'en'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error(`⚠️ Rate limited at ${username}`);
        return null;
      }
      console.error(`❌ Failed to fetch ${username}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const user = data?.data?.user?.result;
    
    if (!user || user.__typename === 'UserUnavailable') {
      return null;
    }

    const legacy = user.legacy;
    return {
      id: user.rest_id,
      username: legacy.screen_name,
      name: legacy.name,
      followers: legacy.followers_count,
      following: legacy.friends_count,
      tweets: legacy.statuses_count,
      verified: legacy.verified || user.is_blue_verified,
      created: legacy.created_at
    };
  } catch (error) {
    console.error(`❌ Error fetching ${username}:`, error.message);
    return null;
  }
}

async function fetchFollowing(userId, count = 50) {
  const variables = {
    userId: userId,
    count: count,
    includePromotedContent: false
  };

  const features = {
    rweb_tipjar_consumption_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    rweb_video_timestamps_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false
  };

  const url = `https://x.com/i/api/graphql/${FOLLOWING_QUERY}/Following?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`;

  try {
    const response = await fetch(url, {
      headers: {
        'authorization': `Bearer ${BEARER}`,
        'cookie': `auth_token=${cookies.auth_token}; ct0=${cookies.ct0}`,
        'x-csrf-token': cookies.ct0,
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-active-user': 'yes',
        'x-twitter-client-language': 'en'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error(`⚠️ Rate limited when fetching following for user ${userId}`);
        return [];
      }
      console.error(`❌ Failed to fetch following for ${userId}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const instructions = data?.data?.user?.result?.timeline?.timeline?.instructions || [];
    const entries = instructions.find(i => i.type === 'TimelineAddEntries')?.entries || [];

    const following = [];
    for (const entry of entries) {
      if (entry.entryId.startsWith('user-')) {
        const user = entry.content?.itemContent?.user_results?.result;
        if (user && user.__typename === 'User') {
          following.push({
            id: user.rest_id,
            username: user.legacy.screen_name,
            name: user.legacy.name,
            followers: user.legacy.followers_count,
            verified: user.legacy.verified || user.is_blue_verified
          });
        }
      }
    }

    return following;
  } catch (error) {
    console.error(`❌ Error fetching following for ${userId}:`, error.message);
    return [];
  }
}

async function main() {
  console.log('🔍 KOL NETWORK AUDIT 2026-03-07');
  console.log(`📊 Starting with ${config.x.accounts.length} accounts\n`);

  // STEP 1: Get Top-20 Accounts with >100K followers (sample for network analysis)
  console.log('📈 STEP 1: Identifying Top KOLs (>100K followers)...\n');
  
  const topKOLsToSample = [];
  
  for (let i = 0; i < Math.min(30, config.x.accounts.length); i++) {
    const username = config.x.accounts[i];
    console.log(`   Checking ${username}...`);
    
    const user = await fetchUser(username);
    await setTimeout(RATE_LIMIT_DELAY);
    
    if (user && user.followers > 100000) {
      topKOLsToSample.push(user);
      results.topKOLs.push(user);
      console.log(`   ✅ ${user.username}: ${user.followers.toLocaleString()} followers`);
      
      if (topKOLsToSample.length >= 20) break;
    } else if (user) {
      console.log(`   ⏭️  ${user.username}: ${user.followers.toLocaleString()} followers (below 100K)`);
    }
  }

  console.log(`\n✅ Found ${topKOLsToSample.length} Top KOLs\n`);

  // STEP 2: NETWORK SCAN - Who follows whom?
  console.log('🕸️  STEP 2: NETWORK SCAN - Analyzing following relationships...\n');
  
  const followedByKOLs = new Map(); // username -> Set of KOL usernames who follow them
  
  for (const kol of topKOLsToSample.slice(0, 15)) { // Limit to 15 to avoid rate limits
    console.log(`   📡 Scanning ${kol.username}'s following list...`);
    
    const following = await fetchFollowing(kol.id, 50);
    await setTimeout(RATE_LIMIT_DELAY);
    
    results.networkMap[kol.username] = following.map(f => f.username);
    
    for (const followedUser of following) {
      if (!followedByKOLs.has(followedUser.username)) {
        followedByKOLs.set(followedUser.username, {
          userData: followedUser,
          followedBy: new Set()
        });
      }
      followedByKOLs.get(followedUser.username).followedBy.add(kol.username);
    }
    
    console.log(`   ✅ Found ${following.length} accounts followed by ${kol.username}`);
  }

  // Find accounts followed by MULTIPLE top KOLs
  console.log('\n🎯 STEP 3: Finding high-signal accounts (followed by multiple KOLs)...\n');
  
  const highSignalAccounts = [];
  for (const [username, data] of followedByKOLs.entries()) {
    if (data.followedBy.size >= 2 && data.userData.followers >= 10000) {
      // Not already in our list
      if (!config.x.accounts.includes(username)) {
        highSignalAccounts.push({
          username,
          followers: data.userData.followers,
          followedBy: Array.from(data.followedBy),
          signalScore: data.followedBy.size
        });
      }
    }
  }

  // Sort by signal score (how many KOLs follow them)
  highSignalAccounts.sort((a, b) => b.signalScore - a.signalScore || b.followers - a.followers);
  
  console.log(`✅ Found ${highSignalAccounts.length} high-signal accounts\n`);
  console.log('Top 10 discoveries:');
  for (const acc of highSignalAccounts.slice(0, 10)) {
    console.log(`   🌟 @${acc.username} - ${acc.followers.toLocaleString()} followers`);
    console.log(`      Followed by: ${acc.followedBy.join(', ')}`);
  }

  results.newCandidates = highSignalAccounts;

  // STEP 4: Random audit of existing accounts
  console.log('\n🔍 STEP 4: Auditing random sample of existing accounts...\n');
  
  const sampleSize = 40;
  const randomSample = [];
  const indices = new Set();
  
  while (indices.size < sampleSize && indices.size < config.x.accounts.length) {
    indices.add(Math.floor(Math.random() * config.x.accounts.length));
  }
  
  for (const idx of Array.from(indices)) {
    const username = config.x.accounts[idx];
    console.log(`   Auditing ${username}...`);
    
    const user = await fetchUser(username);
    await setTimeout(RATE_LIMIT_DELAY);
    
    if (!user) {
      console.log(`   ❌ REMOVE: ${username} (suspended/not found)`);
      results.removedAccounts.push({ username, reason: 'suspended or not found' });
    } else if (user.followers < 10000) {
      console.log(`   ⚠️  ${username}: ${user.followers.toLocaleString()} followers (below threshold)`);
      results.auditResults.push({ ...user, status: 'below_threshold' });
    } else {
      console.log(`   ✅ ${username}: ${user.followers.toLocaleString()} followers`);
      results.auditResults.push({ ...user, status: 'active' });
    }
  }

  // Save results
  const outputPath = process.env.HOME + '/.openclaw/workspace/shared/crypto-scanner/network-audit-2026-03-07.json';
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to network-audit-2026-03-07.json`);
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log(`   Top KOLs analyzed: ${results.topKOLs.length}`);
  console.log(`   New high-signal candidates: ${results.newCandidates.length}`);
  console.log(`   Accounts audited: ${results.auditResults.length}`);
  console.log(`   Accounts to remove: ${results.removedAccounts.length}`);
}

main().catch(console.error);
