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
CORS_ORIGINS=https://task-manager-beta-puce.vercel.app
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
http://13.201.33.176:8000/health
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
http://13.201.33.176/health
```

If it returns a healthy response, the backend is deployed.

## 12. Debug commands

Run on EC2:

```bash
sudo systemctl status taskmanager-api
sudo journalctl -u taskmanager-api -n 100 --no-pager
sudo systemctl status nginx
```

## 13. Connect the Vercel frontend to EC2

This repo includes [frontend/vercel.json](c:/Users/palvt/Desktop/TaskManager/frontend/vercel.json) with rewrites to:

- `http://13.201.33.176/api/*`
- `http://13.201.33.176/health`

That allows the Vercel frontend to call `/api/tasks` and `/api/summary` on its own domain, while Vercel forwards those requests to EC2.

### What to do in Vercel

1. Deploy the `frontend` folder as the project root.
2. Remove `VITE_API_URL` from the production environment variables if you added it.
3. Redeploy the frontend so `vercel.json` is applied.

### Why this is needed

Your backend is on plain `http` at `13.201.33.176`.

If the browser tries to call that IP directly from a Vercel `https` page, it can be blocked as mixed content. The Vercel rewrite avoids that by keeping the browser request on the frontend domain.
