"""
setup_pythonanywhere.py
=======================
Run this script in a PythonAnywhere Bash console to install all
Smart Kisan Python backend dependencies:

    python3.10 setup_pythonanywhere.py

Note: torch and torchvision are large (~800 MB together). On a free
PythonAnywhere account you may hit the 3 GB disk quota. The script
installs them but gracefully skips if disk space is insufficient.
"""

import subprocess
import sys

# Core dependencies (always install)
CORE_PACKAGES = [
    "fastapi==0.110.0",
    "uvicorn==0.28.0",
    "sqlalchemy==2.0.28",
    "twilio==9.0.0",
    "pillow==10.2.0",
    "python-multipart==0.0.9",
    "requests==2.31.0",
    "google-generativeai==0.7.2",
    "python-dotenv==1.0.1",
    "pandas==2.2.1",
]

# Optional ML packages (may be large — install after core)
ML_PACKAGES = [
    "torch==2.2.1",
    "torchvision==0.17.1",
]


def install(packages: list[str], label: str = "") -> None:
    print(f"\n[Setup] Installing {label} packages...")
    for pkg in packages:
        print(f"  Installing: {pkg}", end=" ... ", flush=True)
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "--user", pkg],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            print("✅")
        else:
            print(f"❌  {result.stderr.strip()[:120]}")


if __name__ == "__main__":
    install(CORE_PACKAGES, "core")
    install(ML_PACKAGES, "ML (PyTorch)")

    print("\n[Setup] Installation complete!")
    print("[Setup] Start the server with:")
    print("        uvicorn main:app --host 0.0.0.0 --port 8000")
