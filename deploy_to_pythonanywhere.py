import os
import zipfile
import requests
import time
import sys

def zip_directory(folder_path, zip_path):
    print(f"[zip] Zipping {folder_path} to {zip_path}...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                file_path = os.path.join(root, file)
                # Save file with relative path matching dist/ structure
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
    print("\n--- PythonAnywhere Account Configuration ---")
    username = os.environ.get("PA_USERNAME", "").strip()
    if not username:
        username = input("Enter PythonAnywhere Username [Default: Krishna3114]: ").strip()
    if not username:
        username = "Krishna3114"

    api_token = os.environ.get("PA_API_TOKEN", "").strip()
    if not api_token:
        api_token = input("Enter your PythonAnywhere API Token: ").strip()
    if not api_token:
        print("[error] Error: API Token is required to authenticate with PythonAnywhere.")
        print("You can get it from: Account page -> API Token tab.")
        sys.exit(1)

    region = os.environ.get("PA_REGION", "").strip()
    if not region:
        region = input("Choose PythonAnywhere Region (1: US/Standard, 2: EU) [Default: 1]: ").strip()
    host = "eu.pythonanywhere.com" if region == "2" else "www.pythonanywhere.com"

    headers = {
        "Authorization": f"Token {api_token}"
    }

    # Test connection by listing consoles
    print(f"\n[api] Connecting to PythonAnywhere API ({host})...")
    consoles_url = f"https://{host}/api/v0/user/{username}/consoles/"
    
    try:
        res = requests.get(consoles_url, headers=headers)
        if res.status_code != 200:
            print(f"[error] Connection failed (HTTP {res.status_code}): {res.text}")
            print("Please check your Username, API Token, and Server Region.")
            sys.exit(1)
        print("[api] Connection verified successfully!")
    except Exception as e:
        print(f"[error] Request error: {e}")
        sys.exit(1)

    # 3. Create a new Bash console
    print("\n[console] Creating a temporary Bash console on PythonAnywhere...")
    create_console_res = requests.post(consoles_url, headers=headers, json={"executable": "bash"})
    if create_console_res.status_code not in (200, 201):
        print(f"[error] Failed to create console: {create_console_res.text}")
        sys.exit(1)

    console_data = create_console_res.json()
    console_id = console_data["id"]
    print(f"[console] Created console ID: {console_id}")

    # 4. Upload zip file to home directory
    print(f"\n[api] Uploading 'dist.zip' to /home/{username}/dist.zip...")
    upload_url = f"https://{host}/api/v0/user/{username}/files/path/home/{username}/dist.zip"
    
    try:
        with open(zip_file_path, "rb") as f:
            upload_res = requests.post(upload_url, headers=headers, files={"content": f})
        
        if upload_res.status_code not in (200, 201):
            print(f"[error] Upload failed: {upload_res.text}")
            sys.exit(1)
        print("[api] Upload complete!")
    except Exception as e:
        print(f"[error] Upload error: {e}")
        sys.exit(1)

    # 5. Send unzip command to console
    print("\n[console] Unpacking files on the server...")
    input_url = f"{consoles_url}{console_id}/send_input/"
    
    # Run setup, move, unzip, and cleanup commands
    command = (
        "mkdir -p ~/smart-kisan-frontend && "
        "mv ~/dist.zip ~/smart-kisan-frontend/dist.zip && "
        "unzip -o ~/smart-kisan-frontend/dist.zip -d ~/smart-kisan-frontend/ && "
        "rm ~/smart-kisan-frontend/dist.zip\n"
    )
    
    input_res = requests.post(input_url, headers=headers, json={"input": command})
    if input_res.status_code != 200:
        print(f"[warning] Failed to trigger extraction command in console: {input_res.text}")
        print("You can extract it manually in the console: unzip dist.zip -d ~/smart-kisan-frontend/")
    else:
        print("[console] Extraction commands sent successfully!")
        print("[console] Waiting 5 seconds for extraction command to process...")
        time.sleep(5)

    # Clean up local zip
    if os.path.exists(zip_file_path):
        os.remove(zip_file_path)

    print("\n" + "=" * 60)
    print("         DEPLOYMENT STEP 1 COMPLETE!")
    print("=" * 60)
    print("\nNow, follow these final steps to make your site live:")
    print("1. Log in to your PythonAnywhere account dashboard.")
    print("2. Go to the 'Web' tab.")
    print("3. Click 'Add a new web app' (use Manual Configuration, select any Python version).")
    print("4. Scroll down to the 'Static Files' section.")
    print("5. Add a new entry with:")
    print("   - URL: /")
    print(f"   - Directory: /home/{username}/smart-kisan-frontend/dist")
    print("6. Scroll up and click the green 'Reload' button at the top.")
    print("7. Your React frontend is now hosted on PythonAnywhere!")
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
