#!/bin/bash
DIR="/Users/milo/.openclaw/workspace/shared/crypto-scanner"
OUTFILE="$DIR/audit-results/x.log"
DEAD_FILE="$DIR/audit-results/x_dead.txt"

> "$OUTFILE"
> "$DEAD_FILE"

TOTAL=$(wc -l < "$DIR/audit-results/x_accounts.txt" | tr -d ' ')
echo "=== X/TWITTER AUDIT ($TOTAL accounts) ===" | tee "$OUTFILE"

x_active=0
x_dead=0
x_count=0
START=$(date +%s)
MAX_SECS=780  # 13 minutes

while IFS= read -r handle; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - START))
  if [ $ELAPSED -ge $MAX_SECS ]; then
    echo "TIME LIMIT at $x_count/$TOTAL [${ELAPSED}s]" | tee -a "$OUTFILE"
    break
  fi
  
  ((x_count++))
  
  # Use size-based detection: active accounts > 10KB, dead < 5KB
  SIZE=$(curl -sL --max-time 8 -o /dev/null -w '%{size_download}' \
    "https://syndication.twitter.com/srv/timeline-profile/screen-name/$handle" \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 2>/dev/null)
  
  if [ "$SIZE" -gt 10000 ] 2>/dev/null; then
    echo "ACTIVE: @$handle ($SIZE)" >> "$OUTFILE"
    ((x_active++))
  elif [ "$SIZE" -eq 0 ] 2>/dev/null; then
    # Timeout or network error — keep (uncertain)
    echo "TIMEOUT: @$handle" >> "$OUTFILE"
    ((x_active++))
  else
    echo "DEAD: @$handle ($SIZE bytes)" | tee -a "$OUTFILE"
    echo "$handle" >> "$DEAD_FILE"
    ((x_dead++))
  fi
  
  # Progress every 100
  if [ $((x_count % 100)) -eq 0 ]; then
    echo "Progress: $x_count/$TOTAL ($x_active active, $x_dead dead) [${ELAPSED}s]" | tee -a "$OUTFILE"
  fi
  
  sleep 1
done < "$DIR/audit-results/x_accounts.txt"

echo "X_SUMMARY: total=$TOTAL checked=$x_count active=$x_active dead=$x_dead" | tee -a "$OUTFILE"
echo "X_DEAD_FILE: $DEAD_FILE"
