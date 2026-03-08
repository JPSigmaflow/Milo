#!/bin/bash
# PomesTeam Dashboard Auto-Updater
# Pulls live data from IG API, updates HTML dashboards, generates PNGs
set -e

CREDS="/Users/milo/.openclaw/workspace/shared/pomesteam/instagram-api.json"
TOKEN=$(python3 -c "import json; print(json.load(open('$CREDS'))['access_token'])")
IG_ID="17841400095422058"

# Get live metrics
ACCOUNT=$(curl -s "https://graph.facebook.com/v22.0/${IG_ID}?fields=followers_count,follows_count,media_count&access_token=${TOKEN}")
FOLLOWERS=$(echo "$ACCOUNT" | python3 -c "import sys,json; print(json.load(sys.stdin)['followers_count'])")
FOLLOWING=$(echo "$ACCOUNT" | python3 -c "import sys,json; print(json.load(sys.stdin)['follows_count'])")
POSTS=$(echo "$ACCOUNT" | python3 -c "import sys,json; print(json.load(sys.stdin)['media_count'])")

echo "📊 Live Data:"
echo "  Followers: $FOLLOWERS"
echo "  Following: $FOLLOWING"
echo "  Posts: $POSTS"

# Save to tracker
DATE=$(TZ='Asia/Shanghai' date '+%Y-%m-%d')
TIME=$(TZ='Asia/Shanghai' date '+%H:%M')
echo "{\"date\":\"$DATE\",\"time\":\"$TIME\",\"followers\":$FOLLOWERS,\"following\":$FOLLOWING,\"posts\":$POSTS}" >> /Users/milo/.openclaw/workspace/shared/pomesteam/metrics-log.jsonl

echo "✅ Metrics logged"
