# Task Manager

Deployment-ready task manager with:

- `frontend/`: React + Vite UI with bright colors, gradients, and emoji-heavy styling
- `backend/`: FastAPI + SQLite API for task CRUD and summary stats

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

The frontend expects the API at `http://localhost:8000` by default.

## Docker deployment

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
