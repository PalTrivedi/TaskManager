# Deployment Guide

This project is set up for:

- `frontend/` on Vercel
- `backend/` on an Ubuntu EC2 instance behind Nginx

## 1. Deploy the backend on EC2

### Create the instance

Use an Ubuntu EC2 instance and attach a security group with:

- `22` from your IP only
- `80` from `0.0.0.0/0`
- `443` from `0.0.0.0/0`

AWS documents security groups for EC2 here:

- https://docs.aws.amazon.com/console/ec2/security-groups

### Connect and install packages

```bash
ssh -i /path/to/key.pem ubuntu@YOUR_EC2_PUBLIC_IP
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-venv python3-pip nginx
```

### Copy the backend to the server

Upload or clone the repo, then:

```bash
cd /home/ubuntu/taskmanager/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and set production values:

```env
APP_ENV=production
DEBUG=false
DATABASE_URL=tasks.db
CORS_ORIGINS=https://YOUR_VERCEL_DOMAIN.vercel.app,https://YOUR_CUSTOM_FRONTEND_DOMAIN
```

### Run FastAPI as a service

Copy the included systemd unit:

```bash
sudo cp /home/ubuntu/taskmanager/deploy/ec2/taskmanager-api.service /etc/systemd/system/taskmanager-api.service
sudo systemctl daemon-reload
sudo systemctl enable taskmanager-api
sudo systemctl start taskmanager-api
sudo systemctl status taskmanager-api
```

### Put Nginx in front of Uvicorn

Open the included config at `deploy/ec2/nginx-taskmanager-api.conf` and replace:

- `api.example.com` with your real API domain

Then install it:

```bash
sudo cp /home/ubuntu/taskmanager/deploy/ec2/nginx-taskmanager-api.conf /etc/nginx/sites-available/taskmanager-api
sudo ln -s /etc/nginx/sites-available/taskmanager-api /etc/nginx/sites-enabled/taskmanager-api
sudo nginx -t
sudo systemctl restart nginx
```

### Add HTTPS

If your domain already points to the EC2 public IP:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com
```

FastAPI’s deployment guidance is here:

- https://fastapi.tiangolo.com/deployment/

## 2. Deploy the frontend on Vercel

Vercel’s current Vite deployment docs say Vite projects can deploy directly with Vercel and support environment variables at build time:

- https://vercel.com/docs/frameworks/frontend/vite

### Import the repo

1. Push this repo to GitHub.
2. In Vercel, choose `Add New Project`.
3. Import the repo.
4. Set the **Root Directory** to `frontend`.

### Configure the build

Use these values if Vercel does not auto-detect them:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

### Add the frontend environment variable

In Vercel project settings, add:

```env
VITE_API_URL=https://api.example.com
```

Use the same API domain you configured on EC2.

### Redeploy

After the env var is saved, trigger a new deployment in Vercel.

## 3. Final checks

After both are live:

1. Open the frontend URL from Vercel.
2. Create a task.
3. Confirm the request reaches `https://api.example.com/api/tasks`.
4. If the browser blocks requests, re-check `CORS_ORIGINS` on EC2.

## Notes

- Vercel rewrites are documented here if you later want to proxy `/api` through the frontend domain instead of using `VITE_API_URL`: https://vercel.com/docs/rewrites
- SQLite is fine for a small personal project on one EC2 instance. If you expect concurrent writes or multiple backend instances, move to PostgreSQL.
