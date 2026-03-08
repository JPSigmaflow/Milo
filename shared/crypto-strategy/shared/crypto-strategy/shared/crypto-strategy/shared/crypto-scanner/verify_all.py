import json, urllib.request, urllib.parse, time, sys

with open('config.json') as f:
    config = json.load(f)

accounts = config['x']['accounts']
auth_token = config['x']['auth_token']
ct0 = config['x']['ct0']
bearer = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"

features = json.dumps({"hidden_profile_subscriptions_enabled":True,"rweb_tipjar_consumption_enabled":True,"responsive_web_graphql_exclude_directive_enabled":True,"verified_phone_label_enabled":False,"subscriptions_verification_info_is_identity_verified_enabled":True,"subscriptions_verification_info_verified_since_enabled":True,"highlights_tweets_tab_ui_enabled":True,"responsive_web_twitter_article_notes_tab_enabled":True,"subscriptions_feature_can_gift_premium":False,"creator_subscriptions_tweet_preview_api_enabled":True,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":False,"responsive_web_graphql_timeline_navigation_enabled":True})

dead = []
low_followers = []
alive = []
errors = []

for i, acct in enumerate(accounts):
    variables = json.dumps({"screen_name": acct})
    url = f"https://x.com/i/api/graphql/xc8f1g7BYqr6VTzTbvNlGw/UserByScreenName?variables={urllib.parse.quote(variables)}&features={urllib.parse.quote(features)}"
    
    req = urllib.request.Request(url, headers={
        "authorization": f"Bearer {bearer}",
        "cookie": f"auth_token={auth_token}; ct0={ct0}",
        "x-csrf-token": ct0,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
    })
    
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        
        result = data.get('data', {}).get('user', {}).get('result', {})
        typename = result.get('__typename', '')
        
        if typename == 'UserUnavailable':
            reason = result.get('reason', 'unknown')
            print(f"DEAD: @{acct} ({reason})")
            dead.append(acct)
        elif typename == 'User':
            legacy = result.get('legacy', {})
            followers = legacy.get('followers_count', 0)
            tweets = legacy.get('statuses_count', 0)
            if followers < 10000:
                print(f"LOW: @{acct} ({followers} followers)")
                low_followers.append((acct, followers))
            else:
                alive.append((acct, followers))
                if (i+1) % 20 == 0:
                    print(f"  ...checked {i+1}/{len(accounts)}")
        else:
            print(f"ERR: @{acct} (typename={typename})")
            errors.append(acct)
    except Exception as e:
        err_str = str(e)
        if '429' in err_str:
            print(f"RATE LIMITED at {i+1}/{len(accounts)} - waiting 60s")
            time.sleep(60)
            errors.append(acct)
        else:
            print(f"ERR: @{acct} ({err_str[:80]})")
            errors.append(acct)
    
    time.sleep(1.2)

print(f"\n=== RESULTS ===")
print(f"Total checked: {len(accounts)}")
print(f"Alive (10K+): {len(alive)}")
print(f"Dead/Suspended: {len(dead)} → {dead}")
print(f"Low followers (<10K): {len(low_followers)} → {low_followers}")
print(f"Errors: {len(errors)} → {errors}")

with open('/tmp/x_audit_results.json', 'w') as f:
    json.dump({"dead": dead, "low_followers": low_followers, "alive": [(a,f) for a,f in alive], "errors": errors}, f, indent=2)
