import requests

wsgi_content = """import os
import sys

# Add backend project home directory to Python path
project_home = '/home/Krishna3114/Smart-Kisan-FInal/backend'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Load environment variables from .env
from dotenv import load_dotenv
load_dotenv(os.path.join(project_home, '.env'))

# Import Flask app as WSGI application
from app import app as application
"""

def main():
    username = "Krishna3114"
    api_token = "3d04f7412ab6ddc774ba96e859f5d7ced1f486ec"
    host = "www.pythonanywhere.com"

    url = f"https://{host}/api/v0/user/{username}/files/path/var/www/{username}_pythonanywhere_com_wsgi.py"
    headers = {"Authorization": f"Token {api_token}"}

    print(f"[api] Uploading Flask WSGI configuration to {url}...")
    res = requests.post(url, headers=headers, files={"content": wsgi_content})
    print(f"[api] Upload result: {res.status_code}")

    if res.status_code in (200, 201):
        print("[api] Reloading web app 'Krishna3114.pythonanywhere.com'...")
        reload_url = f"https://{host}/api/v0/user/{username}/webapps/{username}.pythonanywhere.com/reload/"
        reload_res = requests.post(reload_url, headers=headers)
        print(f"[api] Reload result: {reload_res.status_code}")

if __name__ == "__main__":
    main()
