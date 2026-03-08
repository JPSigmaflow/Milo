#!/usr/bin/env python3
"""Cross-post old Instagram posts to Facebook page. Runs in batches."""
import json, urllib.request, urllib.parse, time, sys

BASE = "/Users/milo/.openclaw/workspace/shared/pomesteam"
cfg = json.load(open(f"{BASE}/instagram-api.json"))
page_token = cfg["page_token"]
page_id = cfg["page_id"]
token = cfg["access_token"]

state_file = f"{BASE}/fb-crosspost-state.json"
state = json.load(open(state_file))
all_media = json.load(open(f"{BASE}/all-ig-media.json"))

BATCH_SIZE = int(sys.argv[1]) if len(sys.argv) > 1 else 5
TIMEOUT = 20
start_idx = state["last_posted_index"] + 1
end_idx = min(start_idx + BATCH_SIZE, len(all_media))

posted = 0
errors = 0
for i in range(start_idx, end_idx):
    m = all_media[i]
    mtype = m["media_type"]
    caption = m.get("caption", "") or ""
    media_url = m.get("media_url", "")

    if mtype == "VIDEO":
        print(f"  [{i}] VIDEO skip", flush=True)
        state["last_posted_index"] = i
        json.dump(state, open(state_file, "w"))
        continue

    if mtype == "CAROUSEL_ALBUM":
        try:
            curl = f'https://graph.facebook.com/v21.0/{m["id"]}/children?fields=media_type,media_url&access_token={token}'
            children = json.loads(urllib.request.urlopen(curl, timeout=TIMEOUT).read()).get("data", [])
            media_url = children[0]["media_url"] if children and children[0].get("media_url") else ""
        except Exception as e:
            print(f"  [{i}] CAROUSEL children ERROR: {e}", flush=True)
            errors += 1
            state["last_posted_index"] = i
            json.dump(state, open(state_file, "w"))
            continue
        if not media_url:
            print(f"  [{i}] CAROUSEL skip - no url", flush=True)
            state["last_posted_index"] = i
            json.dump(state, open(state_file, "w"))
            continue

    if not media_url:
        print(f"  [{i}] {mtype} skip - no url", flush=True)
        state["last_posted_index"] = i
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
    state["last_posted_index"] = i
    state["posted_count"] = state.get("posted_count", 0) + 1
    json.dump(state, open(state_file, "w"))

state["last_run"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
json.dump(state, open(state_file, "w"))
print(f"\nDone: {posted} posted, {errors} errors. Next: {state['last_posted_index']+1}/{len(all_media)}", flush=True)
