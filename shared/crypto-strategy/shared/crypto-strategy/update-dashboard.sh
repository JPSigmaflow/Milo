#!/bin/bash
cd "$(dirname "$0")"
echo "Updating dashboard data..."

# Export Pump.fun data
if [ -f "/Users/milo/.openclaw/workspace/shared/pumpfun-tracker/export-pumpfun-data.sh" ]; then
  bash /Users/milo/.openclaw/workspace/shared/pumpfun-tracker/export-pumpfun-data.sh
else
  echo "Warning: Pump.fun export script not found"
fi

# Copy to web root
cp index.html /Users/milo/.openclaw/workspace/

echo "✅ Dashboard updated"
