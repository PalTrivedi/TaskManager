# Backend

FastAPI backend backed by Supabase for task storage and Supabase Auth for user identity.

## Run locally

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

If you `cd app`, this also works:

```bash
uvicorn main:app --reload
```

## Deploy on Vercel

Set the project root to `backend` and make sure `index.py` is present. Configure:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
CORS_ORIGINS=https://YOUR_FRONTEND_PROJECT.vercel.app
```

The frontend authenticates with Supabase and sends a bearer token to the API. The backend verifies that token with Supabase and scopes all task queries to the authenticated user id.
