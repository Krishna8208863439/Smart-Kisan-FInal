import os
import zipfile
import requests
import sys

def zip_directory(folder_path, zip_path):
    print(f"[zip] Zipping {folder_path} to {zip_path}...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, folder_path)
                zipf.write(file_path, arcname)
    print("[zip] Zipping complete!")

def main():
    print("=" * 60)
    print("      Smart Kisan PythonAnywhere Frontend Deployment Tool")
    print("=" * 60)

    # 1. Check for dist folder
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(script_dir, "frontend", "dist")

    if not os.path.exists(dist_dir):
        print(f"[error] Error: Could not find build folder at {dist_dir}")
        print("Please build the frontend first by running: npm run build (inside the frontend directory)")
        sys.exit(1)

    zip_file_path = os.path.join(script_dir, "dist.zip")
    zip_directory(dist_dir, zip_file_path)

    # 2. Gather account configuration
    username = "Krishna3114"
    api_token = "3d04f7412ab6ddc774ba96e859f5d7ced1f486ec"
    host = "www.pythonanywhere.com"

    headers = {
        "Authorization": f"Token {api_token}"
    }

    # 3. Upload zip file to home directory
    print(f"\n[api] Uploading 'dist.zip' to /home/{username}/dist.zip...")
    upload_url = f"https://{host}/api/v0/user/{username}/files/path/home/{username}/dist.zip"
    
    try:
        with open(zip_file_path, "rb") as f:
            upload_res = requests.post(upload_url, headers=headers, files={"content": f})
        
        print(f"[api] Upload result: {upload_res.status_code}")
        if upload_res.status_code not in (200, 201):
            print(f"[error] Upload failed: {upload_res.text}")
            sys.exit(1)
        print("[api] Upload complete!")
    except Exception as e:
        print(f"[error] Upload error: {e}")
        sys.exit(1)
    finally:
        if os.path.exists(zip_file_path):
            os.remove(zip_file_path)

    # 4. Reload the PythonAnywhere web app to trigger extraction on reload
    print(f"\n[api] Reloading web app '{username}.pythonanywhere.com'...")
    reload_url = f"https://{host}/api/v0/user/{username}/webapps/{username}.pythonanywhere.com/reload/"
    reload_res = requests.post(reload_url, headers=headers)
    print(f"[api] Reload result: {reload_res.status_code}")

    print("\n" + "=" * 60)
    print("         FRONTEND DEPLOYMENT COMPLETE (VIA WSGI EXTRACTION)!")
    print("=" * 60)

if __name__ == "__main__":
    main()
