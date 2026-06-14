import os
import zipfile
import requests
import sys

def zip_backend(folder_path, zip_path):
    print(f"Zipping backend {folder_path} to {zip_path}...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            # Exclude node_modules
            if "node_modules" in dirs:
                dirs.remove("node_modules")
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, folder_path)
                zipf.write(file_path, arcname)
    print("Zipping complete!")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(script_dir, "backend")
    zip_file_path = os.path.join(script_dir, "backend.zip")

    zip_backend(backend_dir, zip_file_path)

    username = "Krishna3114"
    api_token = "3d04f7412ab6ddc774ba96e859f5d7ced1f486ec"
    headers = {"Authorization": f"Token {api_token}"}
    upload_url = f"https://www.pythonanywhere.com/api/v0/user/{username}/files/path/home/{username}/backend.zip"

    print(f"Uploading 'backend.zip' to /home/{username}/backend.zip...")
    with open(zip_file_path, "rb") as f:
        res = requests.post(upload_url, headers=headers, files={"content": f})
    
    print(f"Upload result: {res.status_code} {res.text}")

    if os.path.exists(zip_file_path):
        os.remove(zip_file_path)

if __name__ == "__main__":
    main()
