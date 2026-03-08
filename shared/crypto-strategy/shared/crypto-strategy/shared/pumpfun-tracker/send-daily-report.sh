#!/bin/bash
# Send daily Pump.fun status report to Telegram
# Step 1: Store report in DB
# Step 2: Generate detailed report from DB
# Step 3: Send to Telegram

cd "$(dirname "$0")"

echo "[$(date)] Starting daily report..."

# Store report data in DB first
node store-daily-report.mjs
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to store daily report"
  exit 1
fi

# Generate report text from DB
REPORT=$(node daily-report.mjs)
if [ -z "$REPORT" ]; then
  echo "ERROR: Failed to generate report"
  exit 1
fi

# Send to Pump.Fun chat via message tool
# Use OpenClaw message API directly (not CLI to avoid shell escaping issues)
node -e "
const report = \`$REPORT\`;
import('child_process').then(cp => {
  cp.execSync('openclaw message send --channel telegram --target \"-5100226475\" --message \"' + report.replace(/\"/g, '\\\\\"') + '\"', {stdio: 'inherit'});
});
"

echo "[$(date)] Daily report sent"
