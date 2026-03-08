#!/bin/bash
# Auto-push Dashboard to GitHub every 30min

set -e

# Export fresh data
bash /Users/milo/.openclaw/workspace/shared/pumpfun-tracker/export-pumpfun-data.sh > /dev/null 2>&1

# Copy to GitHub Pages folder
cp /Users/milo/milo-dashboard/pumpfun-data.json /Users/milo/milo-dashboard/jpsigmaflow.github.io/Milo/pumpfun-data.json

# Git push
cd /Users/milo/milo-dashboard
git add pumpfun-data.json jpsigmaflow.github.io/Milo/pumpfun-data.json
git commit -m "📊 Auto-update $(date +'%Y-%m-%d %H:%M')" || exit 0
git push
