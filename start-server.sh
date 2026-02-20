#!/bin/bash
# Crypto Dashboard HTTP Server
# Usage: ./start-server.sh

cd "$(dirname "$0")"

# Check if server already running
if lsof -i :8081 >/dev/null 2>&1; then
    echo "✅ Server already running on http://localhost:8081"
    exit 0
fi

echo "🚀 Starting Crypto Dashboard HTTP Server..."
python3 -m http.server 8081 &
SERVER_PID=$!

echo "✅ Dashboard running: http://localhost:8081"
echo "📊 PID: $SERVER_PID"

# Save PID for later cleanup
echo $SERVER_PID > .server.pid