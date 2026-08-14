import os
import zipfile
import requests
import sys
import subprocess
import time

def safe_remove(file_path):
    print(f"[clean] Removing local temporary file {file_path}...")
    for i in range(5):
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
            return
        except PermissionError:
            time.sleep(1)
    if os.path.exists(file_path):
        os.remove(file_path)

def zip_directory(folder_path, zip_path, exclude_dir=None):
    print(f"[zip] Zipping {folder_path} to {zip_path}...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            if exclude_dir:
                if isinstance(exclude_dir, (list, tuple)):
                    for ed in exclude_dir:
                        if ed in dirs:
                            dirs.remove(ed)
                else:
                    if exclude_dir in dirs:
                        dirs.remove(exclude_dir)
            for file in files:
                if file.endswith(".pyc") or "__pycache__" in root or "node_modules" in root or "venv" in root:
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, folder_path)
                zipf.write(file_path, arcname)
    print(f"[zip] Zipping complete: {zip_path}")

def delete_remote_file(remote_path, username, api_token):
    url = f"https://www.pythonanywhere.com/api/v0/user/{username}/files/path/home/{username}/{remote_path}"
    headers = {"Authorization": f"Token {api_token}"}
    try:
        res = requests.delete(url, headers=headers)
        print(f"[clean] Remote delete {remote_path}: {res.status_code}")
    except Exception as e:
        print(f"[warn] Remote delete {remote_path} error: {e}")

def upload_file(local_path, remote_path, username, api_token):
    print(f"[api] Uploading {os.path.basename(local_path)} to /home/{username}/{remote_path}...")
    url = f"https://www.pythonanywhere.com/api/v0/user/{username}/files/path/home/{username}/{remote_path}"
    headers = {"Authorization": f"Token {api_token}"}
    with open(local_path, "rb") as f:
        res = requests.post(url, headers=headers, files={"content": f})
    print(f"[api] Upload result: {res.status_code}")
    if res.status_code not in (200, 201):
        print(f"[error] Upload failed: {res.text}")
        sys.exit(1)

def main():
    username = "Krishna3114"
    api_token = "3d04f7412ab6ddc774ba96e859f5d7ced1f486ec"
    headers = {"Authorization": f"Token {api_token}"}

    script_dir = os.path.dirname(os.path.abspath(__file__))

    # 1. Clean temp remote zip files
    print("\n[clean] Cleaning up remote temporary files on PythonAnywhere...")
    for f in ["dist.zip", "backend.zip", "node_stdout.log", "node_stderr.log"]:
        delete_remote_file(f, username, api_token)

    # 2. Build frontend
    frontend_dir = os.path.join(script_dir, "frontend")
    print("\n[build] Running frontend build (npm run build)...")
    build_res = subprocess.run("npm run build", shell=True, cwd=frontend_dir)
    if build_res.returncode != 0:
        print("[error] Frontend build failed!")
        sys.exit(1)

    # 3. Upload frontend dist.zip
    dist_dir = os.path.join(frontend_dir, "dist")
    dist_zip = os.path.join(script_dir, "dist.zip")
    zip_directory(dist_dir, dist_zip)
    upload_file(dist_zip, "dist.zip", username, api_token)
    safe_remove(dist_zip)

    # 4. Upload Flask backend
    backend_dir = os.path.join(script_dir, "backend")
    backend_zip = os.path.join(script_dir, "backend.zip")
    zip_directory(backend_dir, backend_zip, exclude_dir=["uploads", "node_modules", "venv"])
    upload_file(backend_zip, "backend.zip", username, api_token)
    safe_remove(backend_zip)

    # 5. Upload WSGI configuration for Flask app
    wsgi_content = f"""import os
import sys

# Path to Smart Kisan Flask backend
project_home = '/home/{username}/Smart-Kisan-FInal/backend'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Load environment variables from .env
from dotenv import load_dotenv
load_dotenv(os.path.join(project_home, '.env'))

# Import Flask app entry point
from app import app as application
"""

    wsgi_url = f"https://www.pythonanywhere.com/api/v0/user/{username}/files/path/var/www/{username}_pythonanywhere_com_wsgi.py"
    print(f"\n[api] Uploading WSGI file to {wsgi_url}...")
    res = requests.post(wsgi_url, headers=headers, files={"content": wsgi_content})
    print(f"[api] WSGI upload status: {res.status_code}")

    # 6. Reload Web App
    print(f"\n[api] Reloading web app '{username}.pythonanywhere.com'...")
    reload_url = f"https://www.pythonanywhere.com/api/v0/user/{username}/webapps/{username}.pythonanywhere.com/reload/"
    reload_res = requests.post(reload_url, headers=headers)
    print(f"[api] Reload result: {reload_res.status_code}")

    print("\n" + "=" * 60)
    print("      SMART KISAN FLASK BACKEND DEPLOYMENT COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    main()
