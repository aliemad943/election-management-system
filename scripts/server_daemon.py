#!/usr/bin/env python3
"""
Persistent Next.js server daemon for the Election Management System.
Uses double-fork to fully detach from the parent process.
Restarts the server automatically if it crashes.
"""
import os, sys, time, subprocess, signal

PROJECT_DIR = "/home/z/my-project"
SERVER_CMD = ["node", ".next/standalone/server.js"]
ENV = {
    **os.environ,
    "DATABASE_URL": "file:/home/z/my-project/db/custom.db",
    "NEXTAUTH_SECRET": "5b05b34f992f7e60fbc143f1920d4930a5cf0bed58496fbee66cfba0111d41f2",
    "NEXTAUTH_URL": "http://localhost:3000",
    "JWT_SECRET": "5b05b34f992f7e60fbc143f1920d4930a5cf0bed58496fbee66cfba0111d41f2",
    "PORT": "3000",
    "HOSTNAME": "0.0.0.0",
}
PID_FILE = "/home/z/my-project/.zscripts/server.pid"
LOG_FILE = "/tmp/nextjs-daemon.log"

def write_pid():
    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))

def daemonize():
    """Double-fork to fully detach from parent."""
    pid = os.fork()
    if pid > 0:
        sys.exit(0)
    os.setsid()
    pid2 = os.fork()
    if pid2 > 0:
        sys.exit(0)
    # Redirect stdio
    sys.stdout.flush()
    sys.stderr.flush()
    with open(os.devnull, 'r') as si:
        os.dup2(si.fileno(), 0)
    with open(LOG_FILE, 'a') as so:
        os.dup2(so.fileno(), 1)
        os.dup2(so.fileno(), 2)

def run_server():
    """Run the Next.js server, restarting on crash."""
    os.chdir(PROJECT_DIR)
    write_pid()
    while True:
        print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting Next.js server...", flush=True)
        try:
            proc = subprocess.Popen(SERVER_CMD, env=ENV, cwd=PROJECT_DIR)
            proc.wait()
            code = proc.returncode
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Server exited with code {code}, restarting in 3s...", flush=True)
        except Exception as e:
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Error: {e}, restarting in 3s...", flush=True)
        time.sleep(3)

if __name__ == "__main__":
    daemonize()
    run_server()
