from contextlib import asynccontextmanager

from fastapi import FastAPI, Response, status
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


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}


@app.get("/api/tasks", response_model=list[Task])
async def fetch_tasks() -> list[Task]:
    return list_tasks()


@app.post("/api/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task_endpoint(payload: TaskCreate) -> Task:
    return create_task(payload)


@app.patch("/api/tasks/{task_id}", response_model=Task)
async def update_task_endpoint(task_id: int, payload: TaskUpdate) -> Task:
    return update_task(task_id, payload)


@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_endpoint(task_id: int) -> Response:
    delete_task(task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/summary", response_model=Summary)
async def summary_endpoint() -> Summary:
    return get_summary()
