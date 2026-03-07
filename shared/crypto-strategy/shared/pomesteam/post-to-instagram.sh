#!/bin/bash
# Instagram Graph API Posting Script for @pomesteam
# Usage: ./post-to-instagram.sh <image_path> <caption>

set -e

# Load credentials
CREDS_FILE="$(dirname "$0")/instagram-api.json"
ACCESS_TOKEN=$(python3 -c "import json; print(json.load(open('$CREDS_FILE'))['access_token'])")
IG_USER_ID=$(python3 -c "import json; print(json.load(open('$CREDS_FILE'))['instagram_business_account_id'])")

IMAGE_PATH="$1"
CAPTION="$2"

if [ -z "$IMAGE_PATH" ] || [ -z "$CAPTION" ]; then
    echo "Usage: $0 <image_path> <caption>"
    exit 1
fi

echo "📤 Uploading image to hosting..."
IMAGE_URL=$(curl -s -F "reqtype=fileupload" -F "fileToUpload=@$IMAGE_PATH" https://catbox.moe/user/api.php)
echo "✅ Image URL: $IMAGE_URL"

echo "📝 Creating media container..."
ENCODED_CAPTION=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$CAPTION'''))")
CONTAINER_RESPONSE=$(curl -s -X POST "https://graph.facebook.com/v18.0/$IG_USER_ID/media?image_url=$IMAGE_URL&caption=$ENCODED_CAPTION&access_token=$ACCESS_TOKEN")
CREATION_ID=$(echo "$CONTAINER_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")

if [ -z "$CREATION_ID" ]; then
    echo "❌ Failed to create container: $CONTAINER_RESPONSE"
    exit 1
fi
echo "✅ Container ID: $CREATION_ID"

# Wait for processing
sleep 5

echo "🚀 Publishing..."
PUBLISH_RESPONSE=$(curl -s -X POST "https://graph.facebook.com/v18.0/$IG_USER_ID/media_publish?creation_id=$CREATION_ID&access_token=$ACCESS_TOKEN")
POST_ID=$(echo "$PUBLISH_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")

if [ -z "$POST_ID" ]; then
    echo "❌ Failed to publish: $PUBLISH_RESPONSE"
    exit 1
fi

echo "✅ POST PUBLISHED! ID: $POST_ID"
echo "🔗 https://instagram.com/p/$POST_ID"
