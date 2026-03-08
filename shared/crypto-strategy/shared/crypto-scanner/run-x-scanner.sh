#!/bin/bash
# X-Scanner Cron Runner
# Runs every 6 hours, scans 30 random KOLs from 1,137 total

cd /Users/milo/.openclaw/workspace/shared/crypto-scanner

# Log file
LOG_DIR="logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/x-scanner-$(date +%Y-%m-%d).log"

echo "=== X-Scanner Run ===" >> "$LOG_FILE"
echo "Time: $(date)" >> "$LOG_FILE"

# Run scanner with 30 KOLs
node scanners/x-scanner-v2.mjs 30 >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Success" >> "$LOG_FILE"
  
  # Check if new mentions found
  MENTIONS=$(cat data/x-scanner-output.json | grep -o '"new_mentions": [0-9]*' | grep -o '[0-9]*')
  
  if [ "$MENTIONS" -gt 0 ]; then
    echo "📊 Found $MENTIONS new crypto mentions" >> "$LOG_FILE"
    
    # Optional: Trigger ANALYST if mentions > threshold
    if [ "$MENTIONS" -gt 5 ]; then
      echo "🚨 High activity ($MENTIONS mentions) - consider ANALYST run" >> "$LOG_FILE"
    fi
  else
    echo "📭 No new mentions this run" >> "$LOG_FILE"
  fi
else
  echo "❌ Failed with exit code $EXIT_CODE" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"

# Keep only last 7 days of logs
find "$LOG_DIR" -name "x-scanner-*.log" -mtime +7 -delete
