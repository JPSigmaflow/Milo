#!/bin/bash
AUTH_TOKEN="9a90162cad8ecbe888dc05d97af9fc40c5fbe1bf"
CT0="f17ab672a1e8016cbaca3c2a92b401166fefd61673940cee886678b5c386b481dfedba1be2ef49d34b09c33c0502489d9a403b9f1f7b4aa0bd1de24552c6b9e34a3258e3e09bd3162aeaa5c97a7d2052"
BEARER="AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"

# Test with GraphQL UserByScreenName
check_user() {
  local user=$1
  local resp=$(curl -s --max-time 10 \
    "https://x.com/i/api/graphql/xc8f1g7BYqr6VTzTbvNlGw/UserByScreenName?variables=%7B%22screen_name%22%3A%22${user}%22%7D&features=%7B%22hidden_profile_subscriptions_enabled%22%3Atrue%2C%22rweb_tipjar_consumption_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22subscriptions_verification_info_is_identity_verified_enabled%22%3Atrue%2C%22subscriptions_verification_info_verified_since_enabled%22%3Atrue%2C%22highlights_tweets_tab_ui_enabled%22%3Atrue%2C%22responsive_web_twitter_article_notes_tab_enabled%22%3Atrue%2C%22subscriptions_feature_can_gift_premium%22%3Afalse%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%7D" \
    -H "authorization: Bearer $BEARER" \
    -H "cookie: auth_token=$AUTH_TOKEN; ct0=$CT0" \
    -H "x-csrf-token: $CT0" \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
  
  # Extract follower count and status
  local followers=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['user']['result']['legacy']['followers_count'])" 2>/dev/null)
  local tweets=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['user']['result']['legacy']['statuses_count'])" 2>/dev/null)
  local suspended=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('data',{}).get('user',{}).get('result',{}); print(r.get('__typename',''))" 2>/dev/null)
  
  if [ "$suspended" = "UserUnavailable" ]; then
    echo "DEAD|$user|suspended/unavailable|0|0"
  elif [ -n "$followers" ]; then
    echo "OK|$user|active|$followers|$tweets"
  else
    # Check for errors
    local err=$(echo "$resp" | head -c 200)
    echo "ERR|$user|$err"
  fi
}

# Test first few to see if auth works
for acct in VitalikButerin saylor Pentosh1 CryptoCapo_ TechDev_52 100trillionUSD GCRClassic ColdBloodShill cobie DegenerateNews SimonDixonTwitt ZeroHedge_ BagCalls CryptoHornHairs FossGregfoss Cryptoyieldinfo OGDfarmer JanaCryptoQueen; do
  check_user "$acct"
  sleep 1
done
