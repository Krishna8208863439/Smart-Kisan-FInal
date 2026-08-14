#!/usr/bin/env python3
"""
Smart Kisan - Unified Feature Runner Script
This script launches all three component servers:
1. Python FastAPI Backend (Port 8000)
2. Node.js Express Backend (Port 5000)
3. Vite React Frontend (Port 5173)

It handles parallel subprocess execution, console output prefixing,
dependency checking, and graceful shutdown (cleanup of all subprocesses).
"""

import os
import sys
import subprocess
import threading
import time
import signal

# Colors for terminal output
class Colors:
    FASTAPI = '\033[96m'   # Cyan
    EXPRESS = '\033[92m'   # Green
    VITE = '\033[93m'      # Yellow
    SYSTEM = '\033[95m'    # Magenta
    RESET = '\033[0m'
    BOLD = '\033[1m'
    RED = '\033[91m'

def log(tag, message, color=Colors.SYSTEM):
    print(f"{color}{Colors.BOLD}[{tag}]{Colors.RESET} {color}{message}{Colors.RESET}")

# Global list of running processes
running_processes = []
shutdown_initiated = False

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def print_banner():
    banner = """
    ============================================================
      SMART KISAN - DIGITAL AGRICULTURE PLATFORM RUNNER
    ============================================================
      Starting all features:
        - React Vite Frontend  : http://localhost:5173
        - Node.js Express API  : http://localhost:5000
        - Python FastAPI AI    : http://localhost:8000
    ============================================================
    """
    print(Colors.BOLD + Colors.EXPRESS + banner + Colors.RESET)

def check_command_exists(cmd):
    try:
        subprocess.run(
            [cmd, "--version" if cmd != "python" else "-V"], 
            stdout=subprocess.DEVNULL, 
            stderr=subprocess.DEVNULL, 
            shell=True
        )
        return True
    except FileNotFoundError:
        return False

def check_dependencies(base_dir):
    log("SYSTEM", "Checking system prerequisites...")
    
    # Check Node.js
    if not check_command_exists("node"):
        log("SYSTEM", "Error: Node.js is not installed or not in PATH.", Colors.RED)
        sys.exit(1)
        
    # Check Python
    python_cmd = "python"
    try:
        subprocess.run(["python", "-V"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except FileNotFoundError:
        try:
            subprocess.run(["python3", "-V"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            python_cmd = "python3"
        except FileNotFoundError:
            log("SYSTEM", "Error: Python is not installed or not in PATH.", Colors.RED)
            sys.exit(1)

    # Check frontend package.json / node_modules
    frontend_dir = os.path.join(base_dir, "frontend")
    if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
        log("SYSTEM", "Frontend node_modules not found. Installing dependencies...")
        subprocess.run(["npm", "install"], cwd=frontend_dir, shell=True)

    # Check backend package.json / node_modules
    backend_dir = os.path.join(base_dir, "backend")
    if not os.path.exists(os.path.join(backend_dir, "node_modules")):
        log("SYSTEM", "Backend node_modules not found. Installing dependencies...")
        subprocess.run(["npm", "install"], cwd=backend_dir, shell=True)

    # Check python backend requirements
    py_backend_dir = os.path.join(base_dir, "backend_python")
    log("SYSTEM", "Verifying Python dependencies...")
    try:
        import fastapi
        import uvicorn
        import sqlalchemy
    except ImportError:
        log("SYSTEM", "Required Python packages are missing. Installing from requirements.txt...")
        subprocess.run([python_cmd, "-m", "pip", "install", "-r", "requirements.txt"], cwd=py_backend_dir, shell=True)

    log("SYSTEM", "All prerequisites satisfied!")
    return python_cmd

def stream_output(process, tag, color):
    """Pipe output lines from a process to the main terminal with custom colors and tag prefixes."""
    try:
        for line in iter(process.stdout.readline, ''):
            if not line and process.poll() is not None:
                break
            stripped = line.strip()
            if stripped:
                print(f"{color}{Colors.BOLD}[{tag}]{Colors.RESET} {color}{stripped}{Colors.RESET}")
    except Exception as e:
        if not shutdown_initiated:
            log("SYSTEM", f"Error reading output stream from {tag}: {e}", Colors.RED)

def launch_service(cmd_args, cwd, tag, color):
    """Launch a server subprocess and start a monitoring thread for its console output."""
    log("SYSTEM", f"Starting {tag} service with: {' '.join(cmd_args)}")
    try:
        # Use shell=True for node/npm on Windows to ensure script executes properly
        p = subprocess.Popen(
            cmd_args,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            shell=(os.name == 'nt')
        )
        running_processes.append((tag, p))
        
        # Output streaming thread
        t = threading.Thread(target=stream_output, args=(p, tag, color), daemon=True)
        t.start()
        return p
    except Exception as e:
        log("SYSTEM", f"Failed to start {tag}: {e}", Colors.RED)
        return None

def kill_subprocesses():
    global shutdown_initiated
    shutdown_initiated = True
    log("SYSTEM", "Shutting down all features cleanly...")
    
    for tag, p in running_processes:
        if p.poll() is None:
            log("SYSTEM", f"Stopping {tag} process (PID: {p.pid})...")
            try:
                if os.name == 'nt':
                    # On Windows, taskkill kills the process tree cleanly
                    subprocess.run(
                        ["taskkill", "/F", "/T", "/PID", str(p.pid)],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL
                    )
                else:
                    p.terminate()
                    p.wait(timeout=3)
            except Exception as e:
                log("SYSTEM", f"Error terminating {tag}: {e}", Colors.RED)
                try:
                    p.kill()
                except Exception:
                    pass
    
    log("SYSTEM", "All processes stopped. Thank you for using Smart Kisan!")

def signal_handler(sig, frame):
    kill_subprocesses()
    sys.exit(0)

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print_banner()
    
    # Register Ctrl+C shutdown traps
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Dependencies check
    python_cmd = check_dependencies(base_dir)

    # Launch servers
    # 1. Python FastAPI Backend (Port 8000)
    py_args = [python_cmd, "-m", "uvicorn", "main:app", "--port", "8000", "--reload"]
    p_py = launch_service(py_args, os.path.join(base_dir, "backend_python"), "FastAPI", Colors.FASTAPI)

    # Allow FastAPI model loading / SQLite initialization time
    time.sleep(2)

    # 2. Node.js Express Backend (Port 5000)
    node_args = ["npm", "run", "dev"]
    p_node = launch_service(node_args, os.path.join(base_dir, "backend"), "Express", Colors.EXPRESS)

    # 3. React Vite Frontend (Port 5173)
    frontend_args = ["npm", "run", "dev"]
    p_front = launch_service(frontend_args, os.path.join(base_dir, "frontend"), "Vite", Colors.VITE)

    log("SYSTEM", "All servers launched. Press Ctrl+C to terminate all services together.", Colors.BOLD + Colors.SYSTEM)
    
    # Maintain execution loop
    while True:
        try:
            time.sleep(1)
            # Check if any service crashed unexpectedly
            for tag, p in running_processes:
                ret = p.poll()
                if ret is not None and not shutdown_initiated:
                    log("SYSTEM", f"Service {tag} exited unexpectedly with code {ret}.", Colors.RED)
                    kill_subprocesses()
                    sys.exit(ret)
        except KeyboardInterrupt:
            kill_subprocesses()
            break

if __name__ == "__main__":
    main()
