#!/bin/bash
DIR="/Users/milo/.openclaw/workspace/shared/crypto-scanner"
OUTFILE="$DIR/audit-results/x.log"

# Extract X accounts from config
python3 -c "
import json
with open('$DIR/config.json') as f:
    cfg = json.load(f)
for a in cfg['x']['accounts']:
    print(a)
" > "$DIR/audit-results/x_accounts.txt"

TOTAL=$(wc -l < "$DIR/audit-results/x_accounts.txt" | tr -d ' ')
echo "=== X/TWITTER AUDIT ($TOTAL accounts) ===" | tee "$OUTFILE"

x_active=0
x_dead=0
x_dead_list=""
x_count=0
START=$(date +%s)
MAX_SECS=840  # 14 minutes max

while IFS= read -r handle; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - START))
  if [ $ELAPSED -ge $MAX_SECS ]; then
    echo "TIME LIMIT REACHED after $x_count accounts" | tee -a "$OUTFILE"
    break
  fi
  
  ((x_count++))
  
  resp=$(curl -sL --max-time 8 "https://syndication.twitter.com/srv/timeline-profile/screen-name/$handle" \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 2>/dev/null)
  
  resp_len=${#resp}
  
  if [ $resp_len -gt 500 ] && echo "$resp" | grep -q "tweet\|Tweet\|timeline"; then
    echo "ACTIVE: @$handle" >> "$OUTFILE"
    ((x_active++))
  elif echo "$resp" | grep -q "suspended\|Suspended"; then
    echo "DEAD: @$handle (suspended)" | tee -a "$OUTFILE"
    ((x_dead++))
    x_dead_list="$x_dead_list|$handle"
  elif [ $resp_len -lt 200 ]; then
    echo "DEAD: @$handle (empty/404)" | tee -a "$OUTFILE"
    ((x_dead++))
    x_dead_list="$x_dead_list|$handle"
  elif echo "$resp" | grep -q "error\|Error\|not exist\|doesn.t exist"; then
    echo "DEAD: @$handle (error)" | tee -a "$OUTFILE"
    ((x_dead++))
    x_dead_list="$x_dead_list|$handle"
  else
    # Has content but unclear — keep it (likely rate limited or different format)
    echo "ACTIVE: @$handle (assumed)" >> "$OUTFILE"
    ((x_active++))
  fi
  
  # Progress every 100
  if [ $((x_count % 100)) -eq 0 ]; then
    echo "Progress: $x_count/$TOTAL checked ($x_active active, $x_dead dead) [${ELAPSED}s elapsed]" | tee -a "$OUTFILE"
  fi
  
  # Rate limit handling
  if echo "$resp" | grep -qi "rate.limit\|429\|Too Many"; then
    echo "Rate limited at $x_count, pausing 30s..." | tee -a "$OUTFILE"
    sleep 30
  else
    sleep 0.5
  fi
  
done < "$DIR/audit-results/x_accounts.txt"

echo "X_SUMMARY: total=$TOTAL checked=$x_count active=$x_active dead=$x_dead" | tee -a "$OUTFILE"
echo "X_DEAD_LIST:$x_dead_list" | tee -a "$OUTFILE"
