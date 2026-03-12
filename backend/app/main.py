from fastapi import Depends, FastAPI, Header, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware

try:
    from .config import settings
    from .database import init_db
    from .repository import create_task, delete_task, get_summary, list_tasks, update_task
    from .schemas import Summary, Task, TaskCreate, TaskUpdate
except ImportError:
    from config import settings
    from database import init_db
    from repository import create_task, delete_task, get_summary, list_tasks, update_task
    from schemas import Summary, Task, TaskCreate, TaskUpdate


app = FastAPI(title=settings.app_name, debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    try:
        init_db()
        database_status = "ok"
    except Exception as exc:
        print(f"Healthcheck database probe failed: {exc}")
        database_status = "unavailable"
    return {
        "status": "ok",
        "environment": settings.app_env,
        "database": database_status,
    }


def require_user_id(x_user_id: str | None = Header(default=None, alias="X-User-Id")) -> str:
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing X-User-Id header")
    return x_user_id


@app.get("/api/tasks", response_model=list[Task])
async def fetch_tasks(user_id: str = Depends(require_user_id)) -> list[Task]:
    init_db()
    return list_tasks(user_id)


@app.post("/api/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task_endpoint(
    payload: TaskCreate, user_id: str = Depends(require_user_id)
) -> Task:
    init_db()
    return create_task(user_id, payload)


@app.patch("/api/tasks/{task_id}", response_model=Task)
async def update_task_endpoint(
    task_id: int, payload: TaskUpdate, user_id: str = Depends(require_user_id)
) -> Task:
    init_db()
    return update_task(user_id, task_id, payload)


@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_endpoint(
    task_id: int, user_id: str = Depends(require_user_id)
) -> Response:
    init_db()
    delete_task(user_id, task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/summary", response_model=Summary)
async def summary_endpoint(user_id: str = Depends(require_user_id)) -> Summary:
    init_db()
    return get_summary(user_id)
