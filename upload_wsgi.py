import requests

content = """import os
os.environ['no_proxy'] = '127.0.0.1,localhost,krishna3114.pythonanywhere.com'
os.environ['NO_PROXY'] = '127.0.0.1,localhost,krishna3114.pythonanywhere.com'

import sys
import subprocess
import socket
import urllib.request
import urllib.error
import mimetypes

NODE_PORT = 5050
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
        with zipfile.ZipFile(backend_zip, 'r') as zip_ref:
            zip_ref.extractall('/home/Krishna3114/smart-kisan-backend')
        os.remove(backend_zip)
        subprocess.run(
            ['/home/Krishna3114/.nvm/versions/node/v18.20.8/bin/npm', 'install', '--production'],
            cwd='/home/Krishna3114/smart-kisan-backend',
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

if not is_port_open(NODE_PORT):
    env = os.environ.copy()
    env['PORT'] = str(NODE_PORT)
    env['MONGO_URI'] = 'mongodb://127.0.0.1:27017/smart_kisan'
    env['JWT_SECRET'] = 'supersecretjwtkey'
    env['GOOGLE_CLIENT_ID'] = '1234567890-abc123def456.apps.googleusercontent.com'
    subprocess.Popen(
        [NODE_PATH, SERVER_JS],
        env=env,
        stdout=open('/home/Krishna3114/node_stdout.log', 'a'),
        stderr=open('/home/Krishna3114/node_stderr.log', 'a'),
        cwd='/home/Krishna3114/smart-kisan-backend'
    )

def proxy_request(environ, start_response):
    path = environ.get('PATH_INFO', '')
    query = environ.get('QUERY_STRING', '')
    url = f'http://127.0.0.1:{NODE_PORT}{path}'
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
    if path_info.startswith('/api'):
        return proxy_request(environ, start_response)
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

res = requests.post(
    'https://www.pythonanywhere.com/api/v0/user/Krishna3114/files/path/var/www/krishna3114_pythonanywhere_com_wsgi.py',
    headers={'Authorization': 'Token 3d04f7412ab6ddc774ba96e859f5d7ced1f486ec'},
    files={'content': content.encode('utf-8')}
)
print(res.status_code, res.text)
