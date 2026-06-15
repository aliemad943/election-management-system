#!/bin/bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export NEXTAUTH_SECRET="5b05b34f992f7e60fbc143f1920d4930a5cf0bed58496fbee66cfba0111d41f2"
export NEXTAUTH_URL="http://localhost:3000"
export JWT_SECRET="5b05b34f992f7e60fbc143f1920d4930a5cf0bed58496fbee66cfba0111d41f2"
export PORT=3000
export HOSTNAME=0.0.0.0

# Skip install if node_modules exist (speeds up boot)
if [ ! -d "node_modules" ]; then
  echo "[DEV] Installing dependencies..."
  bun install
fi

# Skip db:push if db exists
if [ ! -f "db/custom.db" ]; then
  echo "[DEV] Setting up database..."
  bun run db:push
  bun run db:seed
fi

echo "[DEV] Starting Next.js standalone server..."
exec node .next/standalone/server.js
