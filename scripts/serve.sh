#!/bin/bash
# Persistent Next.js server wrapper
# This script keeps the Next.js server running by restarting it if it crashes

cd /home/z/my-project

while true; do
  echo "[$(date)] Starting Next.js standalone server..."
  PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done
