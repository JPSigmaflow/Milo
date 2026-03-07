#!/usr/bin/env python3
"""Cross-post curated Instagram posts to Facebook page. Newest first, quality only."""
import json, urllib.request, urllib.parse, time, sys

BASE = "/Users/milo/.openclaw/workspace/shared/pomesteam"
cfg = json.load(open(f"{BASE}/instagram-api.json"))
page_token = cfg["page_token"]
page_id = cfg["page_id"]
token = cfg["access_token"]

state_file = f"{BASE}/fb-crosspost-state.json"
state = json.load(open(state_file))
curated = json.load(open(f"{BASE}/fb-curated-media.json"))

BATCH_SIZE = int(sys.argv[1]) if len(sys.argv) > 1 else 1
TIMEOUT = 20
idx_key = "curated_index"
start_idx = state.get(idx_key, 0)
end_idx = min(start_idx + BATCH_SIZE, len(curated))

if start_idx >= len(curated):
    print(f"All {len(curated)} curated posts done!")
    sys.exit(0)

posted = 0
errors = 0
for i in range(start_idx, end_idx):
    m = curated[i]
    mtype = m["media_type"]
    caption = m.get("caption", "") or ""
    media_url = m.get("media_url", "")

    if mtype == "VIDEO":
        print(f"  [{i}] VIDEO skip — {m['timestamp'][:10]}", flush=True)
        state[idx_key] = i + 1
        json.dump(state, open(state_file, "w"))
        continue

    if mtype == "CAROUSEL_ALBUM":
        # Try fetching children; fall back to cover image media_url
        try:
            curl = f'https://graph.facebook.com/v21.0/{m["id"]}/children?fields=media_type,media_url&access_token={token}'
            children = json.loads(urllib.request.urlopen(curl, timeout=TIMEOUT).read()).get("data", [])
            if children and children[0].get("media_url"):
                media_url = children[0]["media_url"]
            # else: keep original media_url as fallback
        except Exception:
            pass  # keep original media_url as fallback

    # Refresh media_url from IG API (CDN URLs expire)
    try:
        refresh_url = f'https://graph.facebook.com/v21.0/{m["id"]}?fields=media_url&access_token={token}'
        fresh = json.loads(urllib.request.urlopen(refresh_url, timeout=TIMEOUT).read())
        if fresh.get("media_url"):
            media_url = fresh["media_url"]
    except Exception:
        pass  # keep original as fallback

    if not media_url:
        print(f"  [{i}] {mtype} skip — no url", flush=True)
        state[idx_key] = i + 1
        json.dump(state, open(state_file, "w"))
        continue

    try:
        data = urllib.parse.urlencode({
            "url": media_url,
            "caption": caption,
            "access_token": page_token
        }).encode()
        req = urllib.request.Request(f"https://graph.facebook.com/v21.0/{page_id}/photos", data=data, method="POST")
        urllib.request.urlopen(req, timeout=TIMEOUT)
        posted += 1
        print(f"  [{i}] {mtype} ✅ {m['timestamp'][:10]}", flush=True)
    except Exception as e:
        print(f"  [{i}] {mtype} ERROR: {e}", flush=True)
        errors += 1

    time.sleep(2)
    state[idx_key] = i + 1
    state["curated_posted"] = state.get("curated_posted", 0) + 1
    json.dump(state, open(state_file, "w"))

state["last_run"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
json.dump(state, open(state_file, "w"))
print(f"\nDone: {posted} posted, {errors} errors. Progress: {state[idx_key]}/{len(curated)}", flush=True)
