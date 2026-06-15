import subprocess
import os
import sys
import time

os.chdir("/home/z/my-project")
env = os.environ.copy()
env["PORT"] = "3000"
env["HOSTNAME"] = "0.0.0.0"

while True:
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting Next.js server...", flush=True)
    proc = subprocess.Popen(
        ["node", ".next/standalone/server.js"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    # Wait for the server to be ready
    time.sleep(3)
    # Check if still running
    if proc.poll() is None:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Server running as PID {proc.pid}", flush=True)
    else:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Server exited with code {proc.returncode}", flush=True)
        time.sleep(3)
        continue
    
    # Keep the process alive
    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.terminate()
        break
    
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Server stopped, restarting in 3s...", flush=True)
    time.sleep(3)
