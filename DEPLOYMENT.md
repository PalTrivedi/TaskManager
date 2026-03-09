# Backend Deployment on EC2

This guide is only for deploying the `backend/` folder to an Ubuntu EC2 instance.

## 1. Create the EC2 instance

Launch an Ubuntu EC2 instance.

In the security group, allow:

- `22` from `My IP`
- `80` from `0.0.0.0/0`
- `8000` only if you want to test Uvicorn directly before Nginx

## 2. SSH into EC2

Run this on your own computer:

```bash
ssh -i "C:\Users\palvt\Downloads\myaws.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

If your key file is stored somewhere else, replace the path.

## 3. Install required packages on EC2

After logging into the EC2 machine, run:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-venv python3-pip nginx
```

## 4. Create the backend folder on EC2

```bash
mkdir -p /home/ubuntu/taskmanager/backend
cd /home/ubuntu/taskmanager/backend
```

## 5. Copy the backend files to EC2

Run these commands on your own computer from the project root:

```bash
scp -i "C:\Users\palvt\Downloads\myaws.pem" -r backend\app ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/taskmanager/backend/
scp -i "C:\Users\palvt\Downloads\myaws.pem" backend\requirements.txt ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/taskmanager/backend/
scp -i "C:\Users\palvt\Downloads\myaws.pem" backend\.env.example ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/taskmanager/backend/
```

After that, SSH back into the server if needed:

```bash
ssh -i "C:\Users\palvt\Downloads\myaws.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

## 6. Create the Python virtual environment

Run on EC2:

```bash
cd /home/ubuntu/taskmanager/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 7. Create the backend environment file

Run on EC2:

```bash
cp .env.example .env
nano .env
```

Use:

```env
APP_NAME=Task Manager API
APP_ENV=production
DEBUG=false
DATABASE_URL=tasks.db
CORS_ORIGINS=https://YOUR_VERCEL_PROJECT.vercel.app
```

If you later use a custom frontend domain, add it too, separated by commas.

## 8. Test the backend manually

Run on EC2:

```bash
cd /home/ubuntu/taskmanager/backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Then open:

```text
http://YOUR_EC2_PUBLIC_IP:8000/health
```

If it works, stop the process with `Ctrl+C`.

## 9. Create a systemd service

Run on EC2:

```bash
sudo nano /etc/systemd/system/taskmanager-api.service
```

Paste this:

```ini
[Unit]
Description=Task Manager FastAPI service
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/taskmanager/backend
EnvironmentFile=/home/ubuntu/taskmanager/backend/.env
ExecStart=/home/ubuntu/taskmanager/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable taskmanager-api
sudo systemctl start taskmanager-api
sudo systemctl status taskmanager-api
```

## 10. Configure Nginx

Run on EC2:

```bash
sudo nano /etc/nginx/sites-available/taskmanager-api
```

Paste this:

```nginx
server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/taskmanager-api /etc/nginx/sites-enabled/taskmanager-api
sudo nginx -t
sudo systemctl restart nginx
```

## 11. Final backend test

Open:

```text
http://YOUR_EC2_PUBLIC_IP/health
```

If it returns a healthy response, the backend is deployed.

## 12. Debug commands

Run on EC2:

```bash
sudo systemctl status taskmanager-api
sudo journalctl -u taskmanager-api -n 100 --no-pager
sudo systemctl status nginx
```

## Important note

This deploys the backend successfully on EC2 over `http`.

If your frontend is hosted on Vercel, it will be served over `https`, and the browser may block requests to a plain `http` backend as mixed content.

So backend deployment on EC2 is fine, but frontend-to-backend integration may still require HTTPS later.
