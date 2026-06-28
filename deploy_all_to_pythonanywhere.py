import os
import zipfile
import requests
import sys
import subprocess

def zip_directory(folder_path, zip_path, exclude_dir=None):
    print(f"[zip] Zipping {folder_path} to {zip_path}...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            if exclude_dir and exclude_dir in dirs:
                dirs.remove(exclude_dir)
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, folder_path)
                zipf.write(file_path, arcname)
    print(f"[zip] Zipping complete: {zip_path}")

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

    # 1. Build frontend
    frontend_dir = os.path.join(script_dir, "frontend")
    print("\n[build] Running frontend build (npm run build)...")
    build_res = subprocess.run("npm run build", shell=True, cwd=frontend_dir)
    if build_res.returncode != 0:
        print("[error] Frontend build failed!")
        sys.exit(1)

    # 2. Package and upload frontend
    dist_dir = os.path.join(frontend_dir, "dist")
    dist_zip = os.path.join(script_dir, "dist.zip")
    zip_directory(dist_dir, dist_zip)
    upload_file(dist_zip, "dist.zip", username, api_token)
    os.remove(dist_zip)

    # 3. Package and upload Node backend
    backend_dir = os.path.join(script_dir, "backend")
    backend_zip = os.path.join(script_dir, "backend.zip")
    zip_directory(backend_dir, backend_zip, exclude_dir="node_modules")
    upload_file(backend_zip, "backend.zip", username, api_token)
    os.remove(backend_zip)

    # 4. Package and upload Python backend
    py_backend_dir = os.path.join(script_dir, "backend_python")
    py_zip = os.path.join(script_dir, "backend_python.zip")
    zip_directory(py_backend_dir, py_zip, exclude_dir="__pycache__")
    upload_file(py_zip, "backend_python.zip", username, api_token)
    os.remove(py_zip)

    # 5. Create WSGI proxy configurations
    wsgi_content = """import os
import sys
import subprocess
import socket
import urllib.request
import urllib.error
import mimetypes

os.environ['no_proxy'] = '127.0.0.1,localhost,krishna3114.pythonanywhere.com'
os.environ['NO_PROXY'] = '127.0.0.1,localhost,krishna3114.pythonanywhere.com'

def find_free_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    return port

NODE_PORT = find_free_port()
PYTHON_PORT = find_free_port()

with open('/home/Krishna3114/active_ports.txt', 'w') as f:
    f.write(f"NODE_PORT={NODE_PORT}\\nPYTHON_PORT={PYTHON_PORT}\\n")

NODE_PATH = '/home/Krishna3114/.nvm/versions/node/v18.20.8/bin/node'
SERVER_JS = '/home/Krishna3114/smart-kisan-backend/server.js'

def is_port_open(port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        s.connect(('127.0.0.1', port))
        return True
    except:
        return False
    finally:
        s.close()

# Extract backend.zip if it exists
backend_zip = '/home/Krishna3114/backend.zip'
if os.path.exists(backend_zip):
    try:
        import zipfile
        os.makedirs('/home/Krishna3114/smart-kisan-backend', exist_ok=True)
        # Delete old uploaded files that might contain wrong images
        uploads_path = '/home/Krishna3114/smart-kisan-backend/uploads'
        if os.path.exists(uploads_path):
            import shutil
            shutil.rmtree(uploads_path)
            os.makedirs(uploads_path, exist_ok=True)
        with zipfile.ZipFile(backend_zip, 'r') as zip_ref:
            zip_ref.extractall('/home/Krishna3114/smart-kisan-backend')
        os.remove(backend_zip)
        env = os.environ.copy()
        env['PATH'] = '/home/Krishna3114/.nvm/versions/node/v18.20.8/bin:' + env.get('PATH', '')
        subprocess.run(
            ['/home/Krishna3114/.nvm/versions/node/v18.20.8/bin/npm', 'install', '--production'],
            cwd='/home/Krishna3114/smart-kisan-backend',
            env=env,
            stdout=open('/home/Krishna3114/node_stdout.log', 'a'),
            stderr=open('/home/Krishna3114/node_stderr.log', 'a')
        )
    except Exception as e:
        with open('/home/Krishna3114/node_stderr.log', 'a') as log_f:
            log_f.write(f"Backend extract error: {str(e)}\\n")

# Extract dist.zip if it exists
frontend_zip = '/home/Krishna3114/dist.zip'
if os.path.exists(frontend_zip):
    try:
        import zipfile
        os.makedirs('/home/Krishna3114/smart-kisan-frontend', exist_ok=True)
        with zipfile.ZipFile(frontend_zip, 'r') as zip_ref:
            zip_ref.extractall('/home/Krishna3114/smart-kisan-frontend')
        os.remove(frontend_zip)
    except Exception as e:
        with open('/home/Krishna3114/node_stderr.log', 'a') as log_f:
            log_f.write(f"Frontend extract error: {str(e)}\\n")

# Extract backend_python.zip if it exists
py_zip_file = '/home/Krishna3114/backend_python.zip'
if os.path.exists(py_zip_file):
    try:
        import zipfile
        os.makedirs('/home/Krishna3114/smart-kisan-backend-python', exist_ok=True)
        with zipfile.ZipFile(py_zip_file, 'r') as zip_ref:
            zip_ref.extractall('/home/Krishna3114/smart-kisan-backend-python')
        os.remove(py_zip_file)
        # Install Python dependencies (without massive PyTorch dependencies to save disk space)
        subprocess.run(
            ['/usr/bin/python3.10', '-m', 'pip', 'install', '--user', 'fastapi', 'uvicorn', 'sqlalchemy', 'twilio', 'pillow', 'python-multipart', 'requests'],
            stdout=open('/home/Krishna3114/py_install_stdout.log', 'a'),
            stderr=open('/home/Krishna3114/py_install_stderr.log', 'a')
        )
    except Exception as e:
        with open('/home/Krishna3114/py_stderr.log', 'a') as log_f:
            log_f.write(f"Python backend extract error: {str(e)}\\n")

# Kill existing node and python uvicorn servers
subprocess.run(['pkill', '-f', 'node server.js'])
subprocess.run(['pkill', '-f', 'uvicorn main:app'])

# Start Node Server
if not is_port_open(NODE_PORT):
    env = os.environ.copy()
    env['PORT'] = str(NODE_PORT)
    env['MONGO_URI'] = 'mongodb://127.0.0.1:27017/smart_kisan'
    env['JWT_SECRET'] = 'supersecretjwtkey'
    env['GOOGLE_CLIENT_ID'] = '1234567890-abc123def456.apps.googleusercontent.com'
    # Ensure node is in the environment PATH
    env['PATH'] = '/home/Krishna3114/.nvm/versions/node/v18.20.8/bin:' + env.get('PATH', '')
    subprocess.Popen(
        [NODE_PATH, SERVER_JS],
        env=env,
        stdout=open('/home/Krishna3114/node_stdout.log', 'a'),
        stderr=open('/home/Krishna3114/node_stderr.log', 'a'),
        cwd='/home/Krishna3114/smart-kisan-backend'
    )

# Start Python FastAPI Server
if not is_port_open(PYTHON_PORT):
    env = os.environ.copy()
    # Ensure user pip installation bin is in PATH
    env['PATH'] = '/home/Krishna3114/.local/bin:' + env.get('PATH', '')
    subprocess.Popen(
        ['/usr/bin/python3.10', '-m', 'uvicorn', 'main:app', '--port', str(PYTHON_PORT)],
        env=env,
        stdout=open('/home/Krishna3114/py_stdout.log', 'a'),
        stderr=open('/home/Krishna3114/py_stderr.log', 'a'),
        cwd='/home/Krishna3114/smart-kisan-backend-python'
    )

def proxy_request(environ, start_response, port):
    path = environ.get('PATH_INFO', '')
    query = environ.get('QUERY_STRING', '')
    url = f'http://127.0.0.1:{port}{path}'
    if query:
        url += f'?{query}'
    try:
        request_body_size = int(environ.get('CONTENT_LENGTH', 0))
    except ValueError:
        request_body_size = 0
    req_data = None
    if request_body_size > 0:
        req_data = environ['wsgi.input'].read(request_body_size)
    headers = {}
    for key, value in environ.items():
        if key.startswith('HTTP_'):
            header_name = key[5:].replace('_', '-').title()
            if header_name.lower() == 'host':
                continue
            if value and str(value).strip():
                headers[header_name] = value
        elif key in ('CONTENT_TYPE', 'CONTENT_LENGTH'):
            header_name = key.replace('_', '-').title()
            if value and str(value).strip():
                headers[header_name] = value
    method = environ.get('REQUEST_METHOD', 'GET')
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(req, timeout=15) as response:
            resp_headers = []
            for name, val in response.headers.items():
                if name.lower() not in ('transfer-encoding', 'connection', 'content-length'):
                    resp_headers.append((name, val))
            body = response.read()
            resp_headers.append(('Content-Length', str(len(body))))
            start_response(f'{response.status} {response.reason}', resp_headers)
            return [body]
    except urllib.error.HTTPError as e:
        body = e.read()
        resp_headers = []
        for name, val in e.headers.items():
            if name.lower() not in ('transfer-encoding', 'connection', 'content-length'):
                resp_headers.append((name, val))
        resp_headers.append(('Content-Length', str(len(body))))
        start_response(f'{e.code} {e.reason}', resp_headers)
        return [body]
    except Exception as e:
        status = '502 Bad Gateway'
        body = f'Proxy error: {str(e)}'.encode('utf-8')
        headers = [('Content-Type', 'text/plain'), ('Content-Length', str(len(body)))]
        start_response(status, headers)
        return [body]

def serve_index_html(environ, start_response):
    index_path = '/home/Krishna3114/smart-kisan-frontend/index.html'
    try:
        with open(index_path, 'rb') as f:
            body = f.read()
        status = '200 OK'
        headers = [('Content-Type', 'text/html'), ('Content-Length', str(len(body)))]
        start_response(status, headers)
        return [body]
    except Exception as e:
        status = '404 Not Found'
        body = f'Index file not found: {str(e)}'.encode('utf-8')
        headers = [('Content-Type', 'text/plain'), ('Content-Length', str(len(body)))]
        start_response(status, headers)
        return [body]

def application(environ, start_response):
    path_info = environ.get('PATH_INFO', '')
    
    # Route python advisory/diagnose/alerts endpoints to Python Port
    if path_info.startswith('/api/diagnose') or path_info.startswith('/api/advisory') or path_info.startswith('/api/alerts') or path_info.startswith('/api/community') or path_info.startswith('/uploads'):
        return proxy_request(environ, start_response, PYTHON_PORT)
    # Route general Node endpoints to Node Port
    elif path_info.startswith('/api'):
        return proxy_request(environ, start_response, NODE_PORT)
        
    clean_path = os.path.normpath(path_info).lstrip('/')
    file_path = os.path.join('/home/Krishna3114/smart-kisan-frontend', clean_path)
    if os.path.isfile(file_path) and file_path.startswith('/home/Krishna3114/smart-kisan-frontend'):
        mime_type, _ = mimetypes.guess_type(file_path)
        mime_type = mime_type or 'application/octet-stream'
        try:
            with open(file_path, 'rb') as f:
                body = f.read()
            status = '200 OK'
            headers = [('Content-Type', mime_type), ('Content-Length', str(len(body)))]
            start_response(status, headers)
            return [body]
        except:
            pass
    return serve_index_html(environ, start_response)
"""

    # 6. Upload WSGI file
    print(f"\n[api] Uploading new WSGI proxy configuration...")
    wsgi_url = f"https://www.pythonanywhere.com/api/v0/user/{username}/files/path/var/www/krishna3114_pythonanywhere_com_wsgi.py"
    wsgi_res = requests.post(wsgi_url, headers=headers, files={"content": wsgi_content.encode("utf-8")})
    print(f"[api] WSGI upload result: {wsgi_res.status_code}")
    if wsgi_res.status_code not in (200, 201):
        print(f"[error] WSGI upload failed: {wsgi_res.text}")
        sys.exit(1)

    # 7. Reload webapp
    print(f"\n[api] Reloading web app '{username}.pythonanywhere.com'...")
    reload_url = f"https://www.pythonanywhere.com/api/v0/user/{username}/webapps/{username}.pythonanywhere.com/reload/"
    reload_res = requests.post(reload_url, headers=headers)
    print(f"[api] Reload result: {reload_res.status_code}")

    print("\n" + "=" * 60)
    print("      DEPI_ALL DEPLOYMENT COMPLETE FOR NODE & FASTAPI BACKENDS!")
    print("=" * 60)

if __name__ == "__main__":
    main()
