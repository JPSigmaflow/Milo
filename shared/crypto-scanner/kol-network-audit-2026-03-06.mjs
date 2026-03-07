#!/usr/bin/env node

import fs from 'fs';
import { setTimeout } from 'timers/promises';

const BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const cookies = JSON.parse(fs.readFileSync('/Users/milo/.openclaw/workspace/private/x-cookies.json', 'utf8'));

const topKOLs = [
  'VitalikButerin', 'saylor', 'bitcoinmagazine', 'watcherguru', 'coindesk',
  'marionawfal', 'cointelegraph', 'whale_alert', '100trillionUSD', 'CathieDWood',
  'APompliano', 'MMCrypto', 'brian_armstrong', 'TheMoonCarl', 'balajis',
  'RaoulGMI', 'peterschiff', 'polymarket', 'scottmelker', 'AutismCapital'
];

async function getUserId(handle) {
  const url = `https://x.com/i/api/graphql/qW5u-DAuXpMEG0zA1F7UGQ/UserByScreenName?variables=${encodeURIComponent(JSON.stringify({ screen_name: handle, withSafetyModeUserFields: true }))}&features=${encodeURIComponent(JSON.stringify({ hidden_profile_subscriptions_enabled: true, rweb_tipjar_consumption_enabled: true, responsive_web_graphql_exclude_directive_enabled: true, verified_phone_label_enabled: false, subscriptions_verification_info_is_identity_verified_enabled: true, subscriptions_verification_info_verified_since_enabled: true, highlights_tweets_tab_ui_enabled: true, responsive_web_twitter_article_notes_tab_enabled: true, subscriptions_feature_can_gift_premium: true, creator_subscriptions_tweet_preview_api_enabled: true, responsive_web_graphql_skip_user_profile_image_extensions_enabled: false, responsive_web_graphql_timeline_navigation_enabled: true }))}`;

  const res = await fetch(url, {
    headers: {
      'authorization': `Bearer ${BEARER}`,
      'cookie': `auth_token=${cookies.auth_token}; ct0=${cookies.ct0}`,
      'x-csrf-token': cookies.ct0,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-client-language': 'en',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });

  if (!res.ok) {
    console.log(`⚠️  ${handle}: HTTP ${res.status}`);
    return null;
  }

  const data = await res.json();
  const userId = data?.data?.user?.result?.rest_id;
  return userId || null;
}

async function getFollowing(userId, handle, limit = 50) {
  const url = `https://x.com/i/api/graphql/PAnE9toFvlGiABjiJEDWxg/Following?variables=${encodeURIComponent(JSON.stringify({ userId, count: limit, includePromotedContent: false }))}&features=${encodeURIComponent(JSON.stringify({ rweb_tipjar_consumption_enabled: true, responsive_web_graphql_exclude_directive_enabled: true, verified_phone_label_enabled: false, subscriptions_verification_info_is_identity_verified_enabled: true, subscriptions_verification_info_verified_since_enabled: true, highlights_tweets_tab_ui_enabled: true, responsive_web_twitter_article_notes_tab_enabled: true, subscriptions_feature_can_gift_premium: true, creator_subscriptions_tweet_preview_api_enabled: true, responsive_web_graphql_skip_user_profile_image_extensions_enabled: false, responsive_web_graphql_timeline_navigation_enabled: true }))}`;

  const res = await fetch(url, {
    headers: {
      'authorization': `Bearer ${BEARER}`,
      'cookie': `auth_token=${cookies.auth_token}; ct0=${cookies.ct0}`,
      'x-csrf-token': cookies.ct0,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-client-language': 'en',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });

  if (!res.ok) {
    console.log(`⚠️  ${handle} following: HTTP ${res.status}`);
    return [];
  }

  const data = await res.json();
  const entries = data?.data?.user?.result?.timeline?.timeline?.instructions?.find(i => i.type === 'TimelineAddEntries')?.entries || [];

  const following = [];
  for (const entry of entries) {
    const user = entry?.content?.itemContent?.user_results?.result;
    if (!user || user.__typename !== 'User') continue;

    const legacy = user.legacy;
    following.push({
      handle: legacy.screen_name,
      followers: legacy.followers_count,
      verified: user.is_blue_verified || legacy.verified
    });
  }

  return following;
}

async function main() {
  console.log('🔍 KOL Network Audit - 2026-03-06\n');
  console.log(`Analyzing ${topKOLs.length} top KOLs...\n`);

  const networkMap = {};
  const followedBy = {}; // account -> [KOLs who follow them]

  for (const handle of topKOLs) {
    console.log(`\n📡 ${handle}...`);
    
    const userId = await getUserId(handle);
    if (!userId) {
      console.log(`   ❌ Could not get user ID`);
      await setTimeout(2000);
      continue;
    }

    console.log(`   User ID: ${userId}`);
    await setTimeout(1500);

    const following = await getFollowing(userId, handle);
    console.log(`   Following ${following.length} accounts (top 50)`);

    networkMap[handle] = following;

    // Build reverse index
    for (const account of following) {
      if (!followedBy[account.handle]) {
        followedBy[account.handle] = [];
      }
      followedBy[account.handle].push(handle);
    }

    await setTimeout(2000); // Rate limit protection
  }

  // Find accounts followed by multiple top KOLs
  const multiFollow = [];
  for (const [handle, followers] of Object.entries(followedBy)) {
    if (followers.length >= 2) { // At least 2 top KOLs follow them
      const account = networkMap[followers[0]].find(a => a.handle === handle);
      multiFollow.push({
        handle,
        followers: account.followers,
        verified: account.verified,
        followedBy: followers,
        score: followers.length
      });
    }
  }

  // Sort by score (how many top KOLs follow them)
  multiFollow.sort((a, b) => b.score - a.score || b.followers - a.followers);

  // Filter: >10K followers, crypto-relevant, not already in scanner
  const config = JSON.parse(fs.readFileSync('/Users/milo/.openclaw/workspace/shared/crypto-scanner/config.json', 'utf8'));
  const existing = new Set(config.x.accounts.map(h => h.toLowerCase()));

  const newCandidates = multiFollow.filter(acc => 
    acc.followers >= 10000 && 
    !existing.has(acc.handle.toLowerCase())
  );

  // Write report
  const report = {
    date: '2026-03-06',
    topKOLsAnalyzed: topKOLs.length,
    networkMap,
    multiFollowAccounts: newCandidates.slice(0, 50), // Top 50 new candidates
    summary: {
      totalAccountsFound: multiFollow.length,
      newCandidates: newCandidates.length,
      avgScore: newCandidates.length > 0 ? (newCandidates.reduce((s, a) => s + a.score, 0) / newCandidates.length).toFixed(1) : 0
    }
  };

  fs.writeFileSync(
    '/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-network-report-2026-03-06.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\n\n✅ NETWORK AUDIT COMPLETE\n');
  console.log(`📊 Analyzed: ${topKOLs.length} top KOLs`);
  console.log(`🔗 Found: ${multiFollow.length} accounts followed by 2+ KOLs`);
  console.log(`⭐ New candidates: ${newCandidates.length} (>10K followers, not in scanner)`);
  console.log(`\n📄 Report saved: kol-network-report-2026-03-06.json`);

  // Print top 20 new candidates
  console.log('\n🌟 TOP 20 NEW CANDIDATES:\n');
  for (const acc of newCandidates.slice(0, 20)) {
    console.log(`   ${acc.handle.padEnd(25)} | ${acc.followers.toLocaleString().padStart(10)} | Score: ${acc.score} | Followed by: ${acc.followedBy.slice(0, 3).join(', ')}`);
  }
}

main().catch(console.error);
