# Shared Deadline List — Self-Hosting Guide

How to install the app on **cPanel shared hosting** (Option A) or on **your own Linux server** (Option B, recommended).

---

## 1. What the app is made of

| Part | Folder | Technology |
|---|---|---|
| Website (what people see) | `frontend/` | React. You "build" it into plain HTML/JS files |
| Server (API under `/api/...`) | `backend/` | Python 3.11 + FastAPI (`server.py`) |
| Database | — | MongoDB |

**HTTPS is required.** Login cookies are marked `Secure`, so login will not work over plain `http://`.

---

## 2. Before you start (both options)

### 2.1 Get a MongoDB database
cPanel hosting does not include MongoDB. The easiest choice for everyone is **MongoDB Atlas** (it has a free tier):
1. Sign up at https://www.mongodb.com/atlas and create a free cluster.
2. Under **Database Access**, create a user and password.
3. Under **Network Access**, add your server's IP address (or `0.0.0.0/0` while testing).
4. Click **Connect → Drivers** and copy the connection string. It looks like:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

On your own server you can install MongoDB locally instead (see Option B).

### 2.2 Clean up `backend/requirements.txt`
Delete this line (it's an Emergent-only package the app doesn't use, and it isn't on the public package index):
```
emergentintegrations==0.2.2
```

### 2.3 Back up your current tasks
In the existing app, click **Backup** to download your tasks as a `.json` file. After installing, sign in as admin and click **Restore** to load them.

### 2.4 Backend settings — `backend/.env`
Create (or edit) `backend/.env` with **your own** values:
```
MONGO_URL="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
DB_NAME="deadlines"
FRONTEND_URL="https://deadlines.example.com"
JWT_SECRET="PUT-A-LONG-RANDOM-STRING-HERE"
ADMIN_EMAIL="wcollard@yahoo.com"
ADMIN_PASSWORD="choose-a-strong-password"
ADMIN_NAME="W. Collard"
```
- `FRONTEND_URL` = the exact address people type into the browser (no trailing slash).
- Make a random `JWT_SECRET` with: `python3 -c "import secrets; print(secrets.token_hex(32))"`
- The admin account is created on first start **only if it doesn't exist yet**. Changing `ADMIN_PASSWORD` later will not change an existing password; use **Team → key icon** in the app instead.

### 2.5 Frontend setting — `frontend/.env`
```
REACT_APP_BACKEND_URL=https://deadlines.example.com
```
This is the address of the backend **without** `/api`. It gets built into the website, so rebuild the frontend whenever you change it.

### 2.6 Build the website
You need Node.js 18+ and Yarn (`npm install -g yarn`). You can do this on your own computer:
```bash
cd frontend
yarn install
yarn build
```
This creates `frontend/build/`, a folder of static files you upload to the server.

---

## Option B — Your own Linux server (Ubuntu 22.04/24.04) — recommended

Everything runs on one domain: nginx serves the website and forwards `/api` to the Python server.

### B1. Install system packages
```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx certbot python3-certbot-nginx
```
Optional: install MongoDB locally instead of using Atlas (follow https://www.mongodb.com/docs/manual/administration/install-on-linux/). Then use `MONGO_URL="mongodb://localhost:27017"`.

### B2. Copy the code
```bash
sudo mkdir -p /opt/deadlines
sudo chown $USER /opt/deadlines
# upload or git clone the project so you have /opt/deadlines/backend and /opt/deadlines/frontend/build
```

### B3. Set up the backend
```bash
cd /opt/deadlines/backend
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
# create backend/.env as in section 2.4, with FRONTEND_URL=https://deadlines.example.com
./venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001   # quick test, then Ctrl+C
```

### B4. Run the backend as a service
Create `/etc/systemd/system/deadlines.service`:
```ini
[Unit]
Description=Shared Deadline List API
After=network.target

[Service]
WorkingDirectory=/opt/deadlines/backend
ExecStart=/opt/deadlines/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now deadlines
sudo systemctl status deadlines
```

### B5. Configure nginx
Create `/etc/nginx/sites-available/deadlines`:
```nginx
server {
    listen 80;
    server_name deadlines.example.com;

    root /opt/deadlines/frontend/build;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20m;
    }

    location / {
        try_files $uri /index.html;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/deadlines /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d deadlines.example.com     # free HTTPS certificate
```
Here both `.env` files use `https://deadlines.example.com`.

### B6. Updating later
```bash
cd /opt/deadlines/backend && ./venv/bin/pip install -r requirements.txt
sudo systemctl restart deadlines
# rebuild frontend (section 2.6) and replace /opt/deadlines/frontend/build
```

---

## Option A — cPanel shared hosting

**Requirements:** your cPanel must have **"Setup Python App"** (CloudLinux / Passenger) with **Python 3.9 or newer** (3.11 preferred), plus **SSH or Terminal** access. If your host lacks "Setup Python App", use Option B (a small VPS costs a few dollars a month).

cPanel runs Python apps through Passenger, which expects WSGI. FastAPI is ASGI, so we add a small adapter (`a2wsgi`). The website and API go on two subdomains of the same domain:

| What | Address (example) | Folder |
|---|---|---|
| Website | `https://deadlines.example.com` | `~/deadlines.example.com` (document root) |
| API | `https://api.deadlines.example.com` | `~/deadlines_api` |

### A1. Create the subdomains and SSL
1. **cPanel → Domains (or Subdomains):** create `deadlines.example.com` and `api.deadlines.example.com`.
2. **cPanel → SSL/TLS Status:** run **AutoSSL** so both have HTTPS.

### A2. Upload the backend
Upload the contents of `backend/` (`server.py`, `requirements.txt`, `.env`) to `~/deadlines_api/` with File Manager or FTP.

In `~/deadlines_api/.env`, set:
```
FRONTEND_URL="https://deadlines.example.com"
```
(plus the other values from section 2.4).

### A3. Create the Python app
**cPanel → Setup Python App → Create Application**
- Python version: **3.11** (or the newest offered, at least 3.9)
- Application root: `deadlines_api`
- Application URL: `api.deadlines.example.com` with the path left **empty** (`/`)
- Application startup file: `passenger_wsgi.py`
- Application entry point: `application`

Click **Create**. cPanel shows a command at the top, like
`source /home/USER/virtualenv/deadlines_api/3.11/bin/activate && cd /home/USER/deadlines_api`.

### A4. Install the Python packages
Open **cPanel → Terminal** (or SSH), paste that command, then run:
```bash
pip install --upgrade pip
pip install -r requirements.txt
pip install a2wsgi
```

### A5. Create `passenger_wsgi.py`
Replace the file cPanel generated in `~/deadlines_api/` with:
```python
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from a2wsgi import ASGIMiddleware
import server

# Passenger does not run FastAPI startup events, so create the admin and indexes here.
async def _startup():
    await server.ensure_indexes()
    await server.seed_admin()

asyncio.run(_startup())
server.client = server.AsyncIOMotorClient(os.environ["MONGO_URL"])
server.db = server.client[os.environ["DB_NAME"]]

application = ASGIMiddleware(server.app)
```
The last two lines open a fresh database connection for the web worker after the start-up tasks run.

Back in **Setup Python App**, click **Restart**. To test, open
`https://api.deadlines.example.com/api/auth/me` in your browser. You should see `{"detail":"Not authenticated"}`, which means the API is working.

If something fails, check `~/deadlines_api/stderr.log` (or the log path shown in Setup Python App).

### A6. Build and upload the website
1. On your computer, set `frontend/.env` to:
   ```
   REACT_APP_BACKEND_URL=https://api.deadlines.example.com
   ```
2. Build it (section 2.6).
3. Upload **the contents** of `frontend/build/` into the website's document root, e.g. `~/deadlines.example.com/`.
4. In that same folder, create `.htaccess` so page refreshes work:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

### A7. Allow MongoDB Atlas connections
In Atlas **Network Access**, add your hosting server's IP address. The **Shared IP Address** is on the right side of the cPanel home page. Some shared hosts block outgoing connections on port 27017; if the API log shows a connection timeout, ask your host to allow outgoing traffic to MongoDB Atlas.

---

## 3. First sign-in
1. Open your website address and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. Click **Team** to add your colleagues.
3. Click **Restore** and choose the backup `.json` file from step 2.3 to bring your tasks over.

## 4. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Login button does nothing / "Not authenticated" right after login | Not using HTTPS, or `REACT_APP_BACKEND_URL` is wrong (rebuild the frontend after changing it) |
| "Origin not allowed" | `FRONTEND_URL` in `backend/.env` must exactly match the browser address (`https://`, no trailing slash) |
| Browser console shows a CORS error | Same as above: check `FRONTEND_URL`, then restart the backend |
| Refreshing a page shows 404 | Missing `try_files` (nginx) or `.htaccess` (cPanel) |
| API won't start: `KeyError: 'JWT_SECRET'` (or another name) | That setting is missing from `backend/.env` |
| `ServerSelectionTimeoutError` | MongoDB not reachable: check `MONGO_URL`, Atlas Network Access IP list, host firewall |
| Forgot admin password | Delete the admin user in MongoDB (Atlas → Browse Collections → `users`), then restart the backend so it is recreated from `.env` |
