# Task Manager

Deployment-ready task manager with:

- `frontend/`: React + Vite UI with Supabase Auth and a professional-cute dashboard
- `backend/`: FastAPI API backed by Supabase for authenticated per-user task CRUD

## Local development

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend env vars:

```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Docker deployment

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

## Cloud deployment

Deployment steps for Vercel + EC2 are in [DEPLOYMENT.md](c:/Users/palvt/Desktop/TaskManager/DEPLOYMENT.md).
