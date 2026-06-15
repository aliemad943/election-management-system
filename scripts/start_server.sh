#!/bin/bash
cd /home/z/my-project

# Kill any existing server
pkill -f "node.*standalone/server.js" 2>/dev/null
sleep 2

# Start the standalone server
export HOSTNAME=0.0.0.0
export PORT=3000
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export NEXTAUTH_SECRET="5b05b34f992f7e60fbc143f1920d4930a5cf0bed58496fbee66cfba0111d41f2"
export NEXTAUTH_URL="http://localhost:3000"
export JWT_SECRET="5b05b34f992f7e60fbc143f1920d4930a5cf0bed58496fbee66cfba0111d41f2"

nohup node .next/standalone/server.js >> /tmp/nextjs.log 2>&1 &
echo "Server started on port 3000 (proxied via Caddy on port 81)"
sleep 2

# Verify
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo "✓ Server is running successfully"
else
    echo "✗ Server failed to start"
fi
