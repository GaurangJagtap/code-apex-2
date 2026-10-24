#!/usr/bin/env python3
"""
Autonomous AI QA Engineer — Unified Development & Demonstration Runner
Launches:
1. Controlled Sample E-Commerce App on http://127.0.0.1:5001
2. FastAPI Backend on http://127.0.0.1:8000
3. Vite React Frontend on http://127.0.0.1:5173
"""
import sys
import os
import subprocess
import time
import signal

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENV_PYTHON = os.path.join(ROOT_DIR, "backend", "venv", "Scripts", "python.exe")
if not os.path.exists(VENV_PYTHON):
    VENV_PYTHON = os.path.join(ROOT_DIR, "backend", "venv", "bin", "python")
if not os.path.exists(VENV_PYTHON):
    VENV_PYTHON = sys.executable

if sys.platform == "win32":
    extra_paths = [
        r"C:\Program Files\nodejs",
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "Python", "Python312"),
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "Python", "Python312", "Scripts"),
    ]
    cur_path = os.environ.get("PATH", "")
    for ep in extra_paths:
        if os.path.exists(ep) and ep.lower() not in cur_path.lower():
            cur_path = ep + os.pathsep + cur_path
    os.environ["PATH"] = cur_path

def main():
    print("=" * 70)
    print("  AUTONOMOUS AI QA ENGINEER (iMocha Track IM-02)")
    print("=" * 70)
    print("[1/3] Starting Controlled Sample E-Commerce App on http://127.0.0.1:5001...")
    sample_proc = subprocess.Popen(
        [VENV_PYTHON, "-m", "uvicorn", "sample_app.main:app", "--host", "127.0.0.1", "--port", "5001"],
        cwd=ROOT_DIR
    )

    print("[2/3] Starting FastAPI Autonomous QA Backend on http://127.0.0.1:8000...")
    backend_proc = subprocess.Popen(
        [VENV_PYTHON, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=ROOT_DIR
    )

    print("[3/3] Starting Vite Frontend on http://localhost:5173...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=os.path.join(ROOT_DIR, "frontend")
    )

    print("\n" + "*" * 70)
    print("  ALL SERVICES RUNNING SUCCESSFULLY!")
    print("  -> Frontend Console:    http://localhost:5173")
    print("  -> Backend API & Docs:  http://127.0.0.1:8000/docs")
    print("  -> Sample App Target:   http://127.0.0.1:5001")
    print("  Press Ctrl+C to terminate all services.")
    print("*" * 70 + "\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down all processes cleanly...")
        for p in [sample_proc, backend_proc, frontend_proc]:
            try:
                p.terminate()
            except Exception:
                pass
        print("Done.")

if __name__ == "__main__":
    main()
