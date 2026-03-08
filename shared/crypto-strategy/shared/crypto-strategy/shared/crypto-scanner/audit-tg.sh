#!/bin/bash
DIR="/Users/milo/.openclaw/workspace/shared/crypto-scanner"

# Extract TG channels from config
TG_CHANNELS=$(python3 -c "
import json
with open('$DIR/config.json') as f:
    cfg = json.load(f)
for ch in cfg['telegram']['channels']:
    print(ch)
")

tg_active=0
tg_dead=0
tg_dead_list=""
tg_total=0

while IFS= read -r channel; do
  ((tg_total++))
  resp=$(curl -sL --max-time 8 "https://t.me/s/$channel" -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" 2>/dev/null)
  
  if echo "$resp" | grep -q "tgme_page_description\|tgme_widget_message_wrap\|tgme_channel_info"; then
    echo "ACTIVE: $channel"
    ((tg_active++))
  elif echo "$resp" | grep -q "not available\|If you have\|can.t be displayed"; then
    echo "DEAD: $channel"
    ((tg_dead++))
    tg_dead_list="$tg_dead_list|$channel"
  else
    # Check if page has any content at all
    if [ ${#resp} -lt 100 ]; then
      echo "DEAD: $channel (empty response)"
      ((tg_dead++))
      tg_dead_list="$tg_dead_list|$channel"
    else
      echo "UNCLEAR: $channel (keeping)"
    fi
  fi
  sleep 0.5
done <<< "$TG_CHANNELS"

echo "TG_SUMMARY: total=$tg_total active=$tg_active dead=$tg_dead"
echo "TG_DEAD_LIST:$tg_dead_list"
