#!/bin/bash
# Track Gaby's response to motivation messages
# Usage: ./track-gaby-response.sh "<response_text>"

RESPONSE="$1"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
CONFIG="/Users/milo/.openclaw/workspace/shared/pomesteam/gaby-motivation.json"

# Log response
echo "[$TIMESTAMP] Gaby responded: $RESPONSE" >> /Users/milo/.openclaw/workspace/shared/pomesteam/logs/gaby-motivation.log

# Update JSON tracking (via Python)
python3 << EOF
import json
from datetime import datetime

with open('$CONFIG', 'r') as f:
    data = json.load(f)

# Add response
data['tracking']['responses'].append({
    'timestamp': '$TIMESTAMP',
    'message_id': data['state']['last_sent_id'],
    'response': '$RESPONSE'
})

# Update stats
data['tracking']['stats']['total_responses'] += 1
data['tracking']['stats']['response_rate'] = round(
    data['tracking']['stats']['total_responses'] / data['state']['total_sent'] * 100, 1
) if data['state']['total_sent'] > 0 else 0

with open('$CONFIG', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"✅ Response tracked! Total responses: {data['tracking']['stats']['total_responses']}")
EOF
