"""
Cleanup PythonAnywhere storage to free quota, then redeploy.
PythonAnywhere Files API returns directory listing as {filename: "file"|"directory", ...}
"""
import requests
import sys
import os
import subprocess

USERNAME  = "Krishna3114"
API_TOKEN = "3d04f7412ab6ddc774ba96e859f5d7ced1f486ec"
HEADERS   = {"Authorization": f"Token {API_TOKEN}"}
BASE      = f"https://www.pythonanywhere.com/api/v0/user/{USERNAME}"
HOME      = f"/home/{USERNAME}"

def list_dir(abs_path):
    """Returns dict {name: 'file'|'directory'} or {} on error."""
    url = f"{BASE}/files/path{abs_path}"
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        data = res.json()
        if isinstance(data, dict):
            return data
        # Some versions return list of strings
        if isinstance(data, list):
            return {item: "file" for item in data}
    print(f"  [list] {abs_path} -> {res.status_code}: {res.text[:120]}")
    return {}

def delete_path(abs_path):
    """Delete a single file."""
    url = f"{BASE}/files/path{abs_path}"
    res = requests.delete(url, headers=HEADERS)
    ok  = res.status_code in (200, 204)
    print(f"  {'[OK]' if ok else '[FAIL]'} DELETE {abs_path} -> {res.status_code}")
    return ok

def delete_dir_recursive(abs_path, depth=0):
    """Recursively delete all contents of a directory."""
    if depth > 12:
        return
    items = list_dir(abs_path)
    for name, kind in items.items():
        child = f"{abs_path}/{name}"
        if kind == "directory":
            delete_dir_recursive(child, depth + 1)
        else:
            delete_path(child)

print("=" * 60)
print("  PythonAnywhere Storage Cleanup")
print("=" * 60)

# 1. Delete leftover zip files
print("\n[1] Removing leftover zip files...")
for f in ["dist.zip", "backend.zip", "backend_python.zip", "smart-kisan.zip"]:
    delete_path(f"{HOME}/{f}")

# 2. Delete log files
print("\n[2] Removing log files...")
for f in [
    "node_stdout.log", "node_stderr.log",
    "py_stdout.log", "py_stderr.log",
    "py_install_stdout.log", "py_install_stderr.log",
    "active_ports.txt"
]:
    delete_path(f"{HOME}/{f}")

# 3. Clear frontend dist folder (largest static assets)
print("\n[3] Clearing old frontend dist folder contents...")
delete_dir_recursive(f"{HOME}/smart-kisan-frontend")

# 4. Delete node_modules (this is the BIGGEST space saver ~150-200 MB)
print("\n[4] Clearing node_modules (will be reinstalled by npm)...")
delete_dir_recursive(f"{HOME}/smart-kisan-backend/node_modules")

# 5. Delete old uploads (crop image files uploaded by users)
print("\n[5] Clearing old uploaded images...")
delete_dir_recursive(f"{HOME}/smart-kisan-backend/uploads")
delete_dir_recursive(f"{HOME}/smart-kisan-backend-python/uploads")

# 6. Delete Python pycache
print("\n[6] Clearing Python __pycache__...")
delete_dir_recursive(f"{HOME}/smart-kisan-backend-python/__pycache__")

# 7. Check remaining usage (optional: check quota)
print("\n" + "=" * 60)
print("  Cleanup done! Checking disk usage estimate via files list...")
print("=" * 60)

print("\n[7] Redeploying to PythonAnywhere...")
script_dir = os.path.dirname(os.path.abspath(__file__))
result = subprocess.run(
    [sys.executable, os.path.join(script_dir, "deploy_all_to_pythonanywhere.py")],
    cwd=script_dir
)

if result.returncode == 0:
    print("\n[DONE] Deployment successful!")
else:
    print("\n[ERROR] Deployment failed. Check output above.")
sys.exit(result.returncode)
