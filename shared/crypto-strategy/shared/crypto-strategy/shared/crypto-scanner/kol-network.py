#!/usr/bin/env python3
"""KOL Network Analysis - Fetch followings of top KOLs via X GraphQL API"""
import subprocess, json, urllib.parse, time, sys

AUTH_TOKEN = "9a90162cad8ecbe888dc05d97af9fc40c5fbe1bf"
CT0 = "f17ab672a1e8016cbaca3c2a92b401166fefd61673940cee886678b5c386b481dfedba1be2ef49d34b09c33c0502489d9a403b9f1f7b4aa0bd1de24552c6b9e34a3258e3e09bd3162aeaa5c97a7d2052"
BEARER = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"

HEADERS = [
    "-H", f"Cookie: auth_token={AUTH_TOKEN}; ct0={CT0}",
    "-H", f"x-csrf-token: {CT0}",
    "-H", f"Authorization: Bearer {BEARER}",
    "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
]

USER_FEATURES = {"hidden_profile_subscriptions_enabled":True,"profile_label_improvements_pcf_label_in_post_enabled":True,"responsive_web_profile_redirect_enabled":False,"rweb_tipjar_consumption_enabled":False,"verified_phone_label_enabled":False,"subscriptions_verification_info_is_identity_verified_enabled":True,"subscriptions_verification_info_verified_since_enabled":True,"highlights_tweets_tab_ui_enabled":True,"responsive_web_twitter_article_notes_tab_enabled":True,"subscriptions_feature_can_gift_premium":True,"creator_subscriptions_tweet_preview_api_enabled":True,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":False,"responsive_web_graphql_timeline_navigation_enabled":True}

FOLLOWING_FEATURES = {"rweb_video_screen_enabled":False,"profile_label_improvements_pcf_label_in_post_enabled":True,"responsive_web_profile_redirect_enabled":False,"rweb_tipjar_consumption_enabled":False,"verified_phone_label_enabled":False,"creator_subscriptions_tweet_preview_api_enabled":True,"responsive_web_graphql_timeline_navigation_enabled":True,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":False,"premium_content_api_read_enabled":False,"communities_web_enable_tweet_community_results_fetch":True,"c9s_tweet_anatomy_moderator_badge_enabled":True,"responsive_web_grok_analyze_button_fetch_trends_enabled":False,"responsive_web_grok_analyze_post_followups_enabled":False,"responsive_web_jetfuel_frame":True,"responsive_web_grok_share_attachment_enabled":True,"responsive_web_grok_annotations_enabled":True,"articles_preview_enabled":True,"responsive_web_edit_tweet_api_enabled":True,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":True,"view_counts_everywhere_api_enabled":True,"longform_notetweets_consumption_enabled":True,"responsive_web_twitter_article_tweet_consumption_enabled":True,"tweet_awards_web_tipping_enabled":False,"responsive_web_grok_show_grok_translated_post":False,"responsive_web_grok_analysis_button_from_backend":True,"post_ctas_fetch_enabled":False,"freedom_of_speech_not_reach_fetch_enabled":True,"standardized_nudges_misinfo":True,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":True,"longform_notetweets_rich_text_read_enabled":True,"longform_notetweets_inline_media_enabled":True,"responsive_web_grok_image_annotation_enabled":True,"responsive_web_grok_imagine_annotation_enabled":True,"responsive_web_grok_community_note_auto_translation_is_enabled":False,"responsive_web_enhance_cards_enabled":False}

KOLS = ["MilesDeutscher", "zachxbt", "blknoiz06", "cobie", "DefiIgnas", 
        "gainzy222", "SOLBigBrain", "CryptoKaleo", "DonAlt", "AltcoinSherpa"]

RETEST = ["0xWizard", "punk9277", "BoxMining", "PhyrexNi", "IOSG_VC", "HashKeyGroup", "FenbushiCapital"]

def api_call(url):
    cmd = ["curl", "-sL", url] + HEADERS
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return result.stdout

def get_user_id(screen_name):
    variables = json.dumps({"screen_name": screen_name})
    url = f"https://x.com/i/api/graphql/AWbeRIdkLtqTRN7yL_H8yw/UserByScreenName?variables={urllib.parse.quote(variables)}&features={urllib.parse.quote(json.dumps(USER_FEATURES))}"
    raw = api_call(url)
    try:
        data = json.loads(raw)
        if "errors" in data:
            print(f"  API Error for {screen_name}: {data['errors'][0].get('message','')}", file=sys.stderr)
            return None
        user = data.get("data", {}).get("user", {}).get("result", {})
        uid = user.get("rest_id", "")
        legacy = user.get("legacy", {})
        return {
            "id": uid,
            "screen_name": legacy.get("screen_name", screen_name),
            "name": legacy.get("name", ""),
            "followers": legacy.get("followers_count", 0),
            "following_count": legacy.get("friends_count", 0),
            "description": legacy.get("description", "")
        }
    except Exception as e:
        print(f"  ERROR parsing response for {screen_name}: {e} | {raw[:300]}", file=sys.stderr)
        return None

def get_following(user_id, count=100):
    variables = json.dumps({"userId": user_id, "count": count, "includePromotedContent": False})
    url = f"https://x.com/i/api/graphql/MpeScvZhJvmRoTphOYQh2A/Following?variables={urllib.parse.quote(variables)}&features={urllib.parse.quote(json.dumps(FOLLOWING_FEATURES))}"
    raw = api_call(url)
    following = []
    try:
        data = json.loads(raw)
        if "errors" in data:
            for e in data["errors"]:
                msg = str(e.get("message", ""))
                if "Rate limit" in msg or "rate limit" in msg.lower():
                    print(f"  RATE LIMITED!", file=sys.stderr)
                    return "RATE_LIMITED"
                print(f"  API Error: {msg}", file=sys.stderr)
            if not data.get("data"):
                return "ERROR"
        
        timeline = data.get("data", {}).get("user", {}).get("result", {}).get("timeline", {}).get("timeline", {})
        instructions = timeline.get("instructions", [])
        for inst in instructions:
            entries = inst.get("entries", [])
            for entry in entries:
                content = entry.get("content", {})
                if content.get("entryType") == "TimelineTimelineItem":
                    result = content.get("itemContent", {}).get("user_results", {}).get("result", {})
                    if result.get("__typename") == "User":
                        legacy = result.get("legacy", {})
                        core = result.get("core", {})
                        bio = result.get("profile_bio", {})
                        following.append({
                            "id": result.get("rest_id", ""),
                            "screen_name": core.get("screen_name", legacy.get("screen_name", "")),
                            "name": core.get("name", legacy.get("name", "")),
                            "followers": legacy.get("followers_count", legacy.get("normal_followers_count", 0)),
                            "description": (bio.get("description", "") or legacy.get("description", ""))[:200]
                        })
    except Exception as e:
        print(f"  ERROR parsing following: {e} | {raw[:500]}", file=sys.stderr)
        return "ERROR"
    return following

# Load existing accounts
with open("/Users/milo/.openclaw/workspace/shared/crypto-scanner/config.json") as f:
    config = json.load(f)
existing = set(a.lower() for a in config["x"]["accounts"])

results = {"kol_profiles": {}, "followings": {}, "retest": {}, "overlap": {}, "rate_limited": False}

# Step 1: Get KOL user IDs
print("=== PHASE 1: Getting KOL User IDs ===", flush=True)
for kol in KOLS:
    print(f"  Fetching: @{kol}", flush=True)
    info = get_user_id(kol)
    if info:
        results["kol_profiles"][kol] = info
        print(f"    → ID: {info['id']}, Followers: {info['followers']}, Following: {info['following_count']}", flush=True)
    else:
        print(f"    → FAILED", flush=True)
    time.sleep(1.5)

# Step 2: Get followings
print("\n=== PHASE 2: Getting Following Lists ===", flush=True)
for kol, info in results["kol_profiles"].items():
    if not info["id"]:
        continue
    print(f"  Fetching following for @{kol} (ID: {info['id']})", flush=True)
    following = get_following(info["id"])
    if following == "RATE_LIMITED":
        results["rate_limited"] = True
        results["followings"][kol] = "RATE_LIMITED"
        print("  STOPPING - Rate limited!", flush=True)
        break
    elif following == "ERROR":
        results["followings"][kol] = "ERROR"
        print("    → Error fetching", flush=True)
    else:
        results["followings"][kol] = following
        print(f"    → Got {len(following)} accounts", flush=True)
    time.sleep(2)

# Step 3: Find overlaps
print("\n=== PHASE 3: Finding Overlaps ===", flush=True)
account_followers = {}
for kol, following_list in results["followings"].items():
    if not isinstance(following_list, list):
        continue
    for acc in following_list:
        sn = acc["screen_name"].lower()
        if sn not in account_followers:
            account_followers[sn] = {"info": acc, "followed_by": []}
        account_followers[sn]["followed_by"].append(kol)

new_candidates = {}
for sn, data in account_followers.items():
    if len(data["followed_by"]) >= 2 and sn not in existing and data["info"]["followers"] >= 10000:
        new_candidates[sn] = data
        
results["new_candidates_2plus"] = {k: {"screen_name": v["info"]["screen_name"], "followers": v["info"]["followers"], "followed_by": v["followed_by"], "description": v["info"]["description"]} for k,v in new_candidates.items()}

print(f"  Found {len(new_candidates)} new candidates (2+ KOL overlap, >10K followers)", flush=True)
for sn, data in sorted(new_candidates.items(), key=lambda x: len(x[1]["followed_by"]), reverse=True)[:50]:
    print(f"    @{data['info']['screen_name']}: {data['info']['followers']:,} followers, followed by {data['followed_by']}", flush=True)

# Also 1 KOL + high followers
single_high = {}
for sn, data in account_followers.items():
    if len(data["followed_by"]) == 1 and sn not in existing and data["info"]["followers"] >= 50000:
        single_high[sn] = data
results["single_kol_high"] = {k: {"screen_name": v["info"]["screen_name"], "followers": v["info"]["followers"], "followed_by": v["followed_by"], "description": v["info"]["description"]} for k,v in single_high.items()}
print(f"\n  Also {len(single_high)} accounts with 1 KOL + >50K followers", flush=True)
for sn, data in sorted(single_high.items(), key=lambda x: x[1]["info"]["followers"], reverse=True)[:20]:
    print(f"    @{data['info']['screen_name']}: {data['info']['followers']:,} followers (by {data['followed_by'][0]})", flush=True)

# Step 4: Retest
print("\n=== PHASE 4: Retesting ===", flush=True)
for handle in RETEST:
    if handle.lower() in existing:
        print(f"  @{handle} already in scanner, skip", flush=True)
        continue
    print(f"  Testing @{handle}", flush=True)
    info = get_user_id(handle)
    if info and info["id"]:
        results["retest"][handle] = info
        print(f"    → OK: {info['followers']:,} followers", flush=True)
    else:
        print(f"    → FAILED", flush=True)
    time.sleep(1.5)

# Save
with open("/Users/milo/.openclaw/workspace/shared/crypto-scanner/expansion-round3.json", "w") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print("\n=== DONE ===", flush=True)
