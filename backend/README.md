# Backend

FastAPI backend with SQLite persistence for task storage.

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
