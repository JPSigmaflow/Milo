#!/usr/bin/env node

import fs from 'fs';
import { setTimeout } from 'timers/promises';

const BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const cookies = JSON.parse(fs.readFileSync('/Users/milo/.openclaw/workspace/private/x-cookies.json', 'utf8'));
const config = JSON.parse(fs.readFileSync('/Users/milo/.openclaw/workspace/shared/crypto-scanner/config.json', 'utf8'));

// Sample 40 random accounts for audit
const accounts = config.x.accounts.sort(() => Math.random() - 0.5).slice(0, 40);

async function checkAccount(handle) {
  const url = `https://x.com/i/api/graphql/qW5u-DAuXpMEG0zA1F7UGQ/UserByScreenName?variables=${encodeURIComponent(JSON.stringify({ screen_name: handle, withSafetyModeUserFields: true }))}&features=${encodeURIComponent(JSON.stringify({ hidden_profile_subscriptions_enabled: true, rweb_tipjar_consumption_enabled: true, responsive_web_graphql_exclude_directive_enabled: true, verified_phone_label_enabled: false, subscriptions_verification_info_is_identity_verified_enabled: true, subscriptions_verification_info_verified_since_enabled: true, highlights_tweets_tab_ui_enabled: true, responsive_web_twitter_article_notes_tab_enabled: true, subscriptions_feature_can_gift_premium: true, creator_subscriptions_tweet_preview_api_enabled: true, responsive_web_graphql_skip_user_profile_image_extensions_enabled: false, responsive_web_graphql_timeline_navigation_enabled: true }))}`;

  const res = await fetch(url, {
    headers: {
      'authorization': `Bearer ${BEARER}`,
      'cookie': `auth_token=${cookies.auth_token}; ct0=${cookies.ct0}`,
      'x-csrf-token': cookies.ct0,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });

  if (!res.ok) return { handle, status: 'API_ERROR' };

  const data = await res.json();
  const user = data?.data?.user?.result;
  
  if (!user || user.__typename === 'UserUnavailable') {
    return { handle, status: 'SUSPENDED/DELETED', followers: 0 };
  }

  const legacy = user.legacy;
  return {
    handle,
    status: 'ACTIVE',
    followers: legacy.followers_count,
    tweets: legacy.statuses_count,
    created: legacy.created_at
  };
}

async function main() {
  console.log('🔍 Quick Audit - Sample of 40 accounts\n');

  const results = [];
  for (const handle of accounts) {
    process.stdout.write(`   ${handle}... `);
    const result = await checkAccount(handle);
    
    if (result.status === 'ACTIVE') {
      console.log(`✅ ${result.followers.toLocaleString()} followers`);
    } else {
      console.log(`❌ ${result.status}`);
    }

    results.push(result);
    await setTimeout(1500); // Rate limit
  }

  const toRemove = results.filter(r => r.status !== 'ACTIVE');
  const lowFollowers = results.filter(r => r.status === 'ACTIVE' && r.followers < 10000);

  console.log(`\n✅ AUDIT COMPLETE`);
  console.log(`   Checked: ${results.length}`);
  console.log(`   Active: ${results.filter(r => r.status === 'ACTIVE').length}`);
  console.log(`   Suspended/Deleted: ${toRemove.length}`);
  console.log(`   <10K followers: ${lowFollowers.length}`);

  if (toRemove.length > 0) {
    console.log(`\n🗑️  TO REMOVE:`);
    toRemove.forEach(acc => console.log(`   - ${acc.handle}`));
  }

  if (lowFollowers.length > 0) {
    console.log(`\n⚠️  LOW FOLLOWERS (<10K):`);
    lowFollowers.forEach(acc => console.log(`   - ${acc.handle} (${acc.followers.toLocaleString()})`));
  }

  fs.writeFileSync(
    '/Users/milo/.openclaw/workspace/shared/crypto-scanner/quick-audit-results-2026-03-06.json',
    JSON.stringify({ date: '2026-03-06', results, toRemove: toRemove.map(a => a.handle), lowFollowers }, null, 2)
  );
}

main().catch(console.error);
