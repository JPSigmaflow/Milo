#!/bin/bash
# Portfolio Updater - runs every 30 min
# Updates prices + exports dashboard

WORKSPACE="/Users/milo/.openclaw/workspace"
cd "$WORKSPACE/shared/crypto-dashboard"

echo "[$(date)] 🔄 Portfolio Updater starting..."

# 1. Update prices (via Python script or Guardian)
# TODO: Add price update logic here

# 2. Export dashboard
./export-data.sh

echo "[$(date)] ✅ Portfolio Updater complete"
