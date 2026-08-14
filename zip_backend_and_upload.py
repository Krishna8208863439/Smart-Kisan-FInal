import os
import zipfile
import requests
import sys

def zip_backend(folder_path, zip_path):
    print(f"[zip] Zipping backend {folder_path} to {zip_path}...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            if "node_modules" in dirs:
                dirs.remove("node_modules")
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, folder_path)
                zipf.write(file_path, arcname)
    print("[zip] Zipping complete!")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(script_dir, "backend")
    zip_file_path = os.path.join(script_dir, "backend.zip")

    # 1. Zip backend
    zip_backend(backend_dir, zip_file_path)

    username = "Krishna3114"
    api_token = "3d04f7412ab6ddc774ba96e859f5d7ced1f486ec"
    headers = {"Authorization": f"Token {api_token}"}
    
    # 2. Upload zip file to home directory
    print(f"\n[api] Uploading 'backend.zip' to /home/{username}/backend.zip...")
    upload_url = f"https://www.pythonanywhere.com/api/v0/user/{username}/files/path/home/{username}/backend.zip"
    
    try:
        with open(zip_file_path, "rb") as f:
            res = requests.post(upload_url, headers=headers, files={"content": f})
        print(f"[api] Upload result: {res.status_code}")
        if res.status_code not in (200, 201):
            print(f"[error] Upload failed: {res.text}")
            sys.exit(1)
    except Exception as e:
        print(f"[error] Upload error: {e}")
        sys.exit(1)
    finally:
        if os.path.exists(zip_file_path):
            os.remove(zip_file_path)

    # 3. Reload the PythonAnywhere web app to trigger extraction and server restart
    print(f"\n[api] Reloading web app '{username}.pythonanywhere.com'...")
    reload_url = f"https://www.pythonanywhere.com/api/v0/user/{username}/webapps/{username}.pythonanywhere.com/reload/"
    reload_res = requests.post(reload_url, headers=headers)
    print(f"[api] Reload result: {reload_res.status_code}")
    
    print("\n" + "=" * 60)
    print("         BACKEND DEPLOYMENT COMPLETE (VIA WSGI EXTRACTION)!")
    print("=" * 60)

if __name__ == "__main__":
    main()
