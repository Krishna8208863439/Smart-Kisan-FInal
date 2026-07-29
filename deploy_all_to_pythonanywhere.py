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
            print(f"[warn] File {file_path} locked. Retrying in 1s... (attempt {i+1}/5)")
            time.sleep(1)
    # Final attempt
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

    # 0. Clean old temporary files on remote PA server
    print("\n[clean] Cleaning up remote temp zips and logs on PythonAnywhere...")
    for f in ["dist.zip", "backend.zip", "backend_python.zip", "node_stdout.log", "node_stderr.log", "py_stdout.log", "py_stderr.log"]:
        delete_remote_file(f, username, api_token)

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
    safe_remove(dist_zip)

    # 3. Package and upload Node backend
    backend_dir = os.path.join(script_dir, "backend")
    backend_zip = os.path.join(script_dir, "backend.zip")
    zip_directory(backend_dir, backend_zip, exclude_dir=["node_modules", "uploads"])
    upload_file(backend_zip, "backend.zip", username, api_token)
    safe_remove(backend_zip)


    # 4. Package and upload Python backend
    py_backend_dir = os.path.join(script_dir, "backend_python")
    py_zip = os.path.join(script_dir, "backend_python.zip")
    zip_directory(py_backend_dir, py_zip, exclude_dir=["__pycache__"])
    upload_file(py_zip, "backend_python.zip", username, api_token)
    safe_remove(py_zip)

    # 5. Create WSGI proxy configurations
    wsgi_content = r'''import os
import sys
import subprocess
import socket
import urllib.request
import urllib.error
import mimetypes

# Clean up leftover corrupt numpy user packages
subprocess.run(['rm', '-rf', '/home/Krishna3114/.local/lib/python3.10/site-packages/numpy'])
subprocess.run(['rm', '-rf', '/home/Krishna3114/.local/lib/python3.10/site-packages/~umpy'])

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
    f.write(f"NODE_PORT={NODE_PORT}\nPYTHON_PORT={PYTHON_PORT}\n")

NODE_PATH = '/home/Krishna3114/.nvm/versions/node/v18.20.8/bin/node'
SERVER_JS = '/home/Krishna3114/smart-kisan-backend/server.js'

# Auto-detect node path if hardcoded one doesn't exist
import glob as _glob
if not os.path.exists(NODE_PATH):
    candidates = _glob.glob('/home/Krishna3114/.nvm/versions/node/*/bin/node')
    if candidates:
        candidates.sort(reverse=True)
        NODE_PATH = candidates[0]
    else:
        # Try system node
        for p in ['/usr/bin/node', '/usr/local/bin/node']:
            if os.path.exists(p):
                NODE_PATH = p
                break

NODE_BIN_DIR = os.path.dirname(NODE_PATH) if NODE_PATH else ''

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
        # Clean old corrupted node_modules and .npm cache to avoid EEXIST / ENOTEMPTY errors during npm install
        import shutil
        nm_path = '/home/Krishna3114/smart-kisan-backend/node_modules'
        if os.path.exists(nm_path):
            shutil.rmtree(nm_path, ignore_errors=True)
        npm_cache = '/home/Krishna3114/.npm'
        if os.path.exists(npm_cache):
            shutil.rmtree(npm_cache, ignore_errors=True)


        env = os.environ.copy()
        if NODE_BIN_DIR:
            env['PATH'] = NODE_BIN_DIR + ':' + env.get('PATH', '')
            npm_bin = os.path.join(NODE_BIN_DIR, 'npm')
        else:
            npm_bin = 'npm'
        subprocess.run(
            [npm_bin, 'install', '--production'],
            cwd='/home/Krishna3114/smart-kisan-backend',
            env=env,
            stdout=open('/home/Krishna3114/node_stdout.log', 'a'),
            stderr=open('/home/Krishna3114/node_stderr.log', 'a')
        )



    except Exception as e:
        with open('/home/Krishna3114/node_stderr.log', 'a') as log_f:
            log_f.write(f"Backend extract error: {str(e)}\n")

# Extract dist.zip if it exists
frontend_zip = '/home/Krishna3114/dist.zip'
if os.path.exists(frontend_zip):
    try:
        import zipfile
        import shutil
        target_fe = '/home/Krishna3114/smart-kisan-frontend'
        if os.path.exists(target_fe):
            shutil.rmtree(target_fe)
        os.makedirs(target_fe, exist_ok=True)
        with zipfile.ZipFile(frontend_zip, 'r') as zip_ref:
            zip_ref.extractall(target_fe)
        os.remove(frontend_zip)
    except Exception as e:
        with open('/home/Krishna3114/node_stderr.log', 'a') as log_f:
            log_f.write(f"Frontend extract error: {str(e)}\n")

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
            ['/usr/bin/python3.10', '-m', 'pip', 'install', '--user', '--no-cache-dir', 'fastapi', 'uvicorn', 'sqlalchemy', 'twilio', 'pillow', 'python-multipart', 'requests', 'reportlab', 'numpy', 'faiss-cpu', 'pandas', 'python-dotenv'],
            stdout=open('/home/Krishna3114/py_install_stdout.log', 'a'),
            stderr=open('/home/Krishna3114/py_install_stderr.log', 'a')
        )
    except Exception as e:
        with open('/home/Krishna3114/py_stderr.log', 'a') as log_f:
            log_f.write(f"Python backend extract error: {str(e)}\n")

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
    if NODE_BIN_DIR:
        env['PATH'] = NODE_BIN_DIR + ':' + env.get('PATH', '')
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
        headers = [
            ('Content-Type', 'text/html'),
            ('Content-Length', str(len(body))),
            ('Cache-Control', 'no-cache, no-store, must-revalidate'),
            ('Pragma', 'no-cache'),
            ('Expires', '0')
        ]
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
    
    # Route python advisory/diagnose/alerts/dataset/py_uploads endpoints to Python Port
    if (path_info.startswith('/api/diagnose') or path_info.startswith('/api/crop-diagnose')
            or path_info.startswith('/api/crop-diagnostics')
            or path_info.startswith('/api/leaf-diagnose') or path_info.startswith('/api/leaf-disease')
            or path_info.startswith('/api/leaf-diagnostics')
            or path_info.startswith('/api/crop-disease-detect') or path_info.startswith('/api/crop-disease')
            or path_info.startswith('/api/advisory') or path_info.startswith('/api/alerts')
            or path_info.startswith('/api/community') or path_info.startswith('/api/dataset')
            or path_info.startswith('/api/chat') or path_info.startswith('/api/generate-pdf')
            or path_info.startswith('/api/health') or path_info.startswith('/py_uploads')
            or path_info.startswith('/api/yield-predict')):
        return proxy_request(environ, start_response, PYTHON_PORT)
    # Route Node uploads static files and general Node endpoints to Node Port
    elif path_info.startswith('/uploads') or path_info.startswith('/api'):
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
            headers = [
                ('Content-Type', mime_type),
                ('Content-Length', str(len(body))),
                ('Cache-Control', 'no-cache' if clean_path.endswith('.html') or clean_path.endswith('.js') else 'public, max-age=31536000')
            ]
            start_response(status, headers)
            return [body]
        except:
            pass
    return serve_index_html(environ, start_response)
'''

    # 6. Upload WSGI file
    print(f"\n[api] Uploading new WSGI proxy configuration...")
    wsgi_url = f"https://www.pythonanywhere.com/api/v0/user/{username}/files/path/var/www/krishna3114_pythonanywhere_com_wsgi.py"
    wsgi_res = requests.post(wsgi_url, headers=headers, files={"content": wsgi_content.encode("utf-8")})
    print(f"[api] WSGI upload result: {wsgi_res.status_code}")
    if wsgi_res.status_code not in (200, 201):
        print(f"[error] WSGI upload failed: {wsgi_res.text}")
        sys.exit(1)

    # 6.5 Ensure no conflicting static file mappings exist on PythonAnywhere (e.g. url='/' mapping)
    try:
        sf_url = f"https://www.pythonanywhere.com/api/v0/user/{username}/webapps/{username}.pythonanywhere.com/static_files/"
        sf_res = requests.get(sf_url, headers=headers)
        if sf_res.status_code == 200:
            mappings = sf_res.json()
            for m in mappings:
                if m.get("url") == "/":
                    del_url = f"{sf_url}{m['id']}/"
                    del_res = requests.delete(del_url, headers=headers)
                    print(f"[clean] Removed conflicting static mapping url='/' (ID {m['id']}): {del_res.status_code}")
    except Exception as e:
        print(f"[warn] Static files check error: {e}")

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
