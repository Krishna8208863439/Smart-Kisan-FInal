"""
Run this script on PythonAnywhere Bash console to install dependencies:
  python3.10 setup_pythonanywhere.py
"""
import subprocess
import sys

packages = [
    "fastapi==0.110.0",
    "uvicorn==0.28.0",
    "sqlalchemy==2.0.28",
    "twilio==9.0.0",
    "pillow==10.2.0",
    "python-multipart==0.0.9",
    "requests==2.31.0",
    "google-generativeai==0.7.2",
    "python-dotenv==1.0.1",
]

print("[Setup] Installing Smart Kisan Python backend dependencies...")
for pkg in packages:
    print(f"  Installing: {pkg}")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "--user", pkg],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"  ✅ {pkg}")
    else:
        print(f"  ❌ Failed: {result.stderr[:200]}")

print("\n[Setup] Done! All packages installed.")
print("[Setup] Now run: uvicorn main:app --host 0.0.0.0 --port 8000")
