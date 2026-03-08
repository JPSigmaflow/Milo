#!/bin/bash
# Instagram Profile Scanner — cached, token-efficient
# Usage: ./scan-profile.sh <username>
# Scans once, caches locally. Re-scan only if cache > 24h old.

set -e
CREDS_FILE="$(dirname "$0")/instagram-api.json"
CACHE_DIR="$(dirname "$0")/competitor-cache"
mkdir -p "$CACHE_DIR"

USERNAME="$1"
if [ -z "$USERNAME" ]; then
    echo "Usage: $0 <username>"
    exit 1
fi

CACHE_FILE="$CACHE_DIR/${USERNAME}.json"

# Check cache age (skip if < 24h old)
if [ -f "$CACHE_FILE" ]; then
    AGE=$(( $(date +%s) - $(stat -f %m "$CACHE_FILE") ))
    if [ "$AGE" -lt 86400 ]; then
        echo "📋 Cached ($(( AGE / 3600 ))h ago):"
        cat "$CACHE_FILE"
        exit 0
    fi
fi

ACCESS_TOKEN=$(python3 -c "import json; print(json.load(open('$CREDS_FILE'))['access_token'])")
IG_USER_ID=$(python3 -c "import json; print(json.load(open('$CREDS_FILE'))['instagram_business_account_id'])")

# Single API call — all fields at once (token-efficient)
RESPONSE=$(curl -s -G "https://graph.facebook.com/v22.0/$IG_USER_ID" \
  --data-urlencode "fields=business_discovery.fields(username,name,biography,followers_count,follows_count,media_count,profile_picture_url,media.limit(10).fields(caption,like_count,comments_count,timestamp,media_type,permalink))" \
  --data-urlencode "access_token=$ACCESS_TOKEN" \
  --data-urlencode "username=$USERNAME")

# Check for errors
ERROR=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',{}).get('message',''))" 2>/dev/null)
if [ -n "$ERROR" ]; then
    echo "❌ Error: $ERROR"
    exit 1
fi

# Cache result
echo "$RESPONSE" | python3 -m json.tool > "$CACHE_FILE"
echo "✅ Scanned & cached: $USERNAME"
cat "$CACHE_FILE"
