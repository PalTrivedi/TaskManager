from datetime import datetime, timezone

from fastapi import HTTPException, status

try:
    from .database import get_client
    from .schemas import Summary, Task, TaskCreate, TaskUpdate
except ImportError:
    from database import get_client
    from schemas import Summary, Task, TaskCreate, TaskUpdate


def _parse_iso(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _row_to_task(row: dict) -> Task:
    return Task(
        id=row["id"],
        user_id=row["user_id"],
        title=row["title"],
        description=row.get("description", ""),
        category=row.get("category", "Personal"),
        priority=row.get("priority", "medium"),
        completed=bool(row.get("completed", False)),
        due_date=row.get("due_date"),
        created_at=_parse_iso(row.get("created_at")),
        updated_at=_parse_iso(row.get("updated_at")),
    )


def list_tasks(user_id: str) -> list[Task]:
    client = get_client()
    response = (
        client.table("tasks")
        .select("*")
        .eq("user_id", user_id)
        .order("completed")
        .order("id", desc=True)
        .execute()
    )
    rows = response.data or []
    return [_row_to_task(row) for row in rows]


def create_task(user_id: str, payload: TaskCreate) -> Task:
    now = datetime.now(timezone.utc).isoformat()
    due_date = payload.due_date.isoformat() if payload.due_date else None
    client = get_client()
    response = (
        client.table("tasks")
        .insert(
            {
                "user_id": user_id,
                "title": payload.title,
                "description": payload.description,
                "category": payload.category,
                "priority": payload.priority,
                "completed": payload.completed,
                "due_date": due_date,
                "created_at": now,
                "updated_at": now,
            }
        )
        .execute()
    )
    rows = response.data or []
    if not rows:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Task creation failed")
    return _row_to_task(rows[0])


def get_task(user_id: str, task_id: int) -> Task:
    client = get_client()
    response = (
        client.table("tasks")
        .select("*")
        .eq("id", task_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    row = response.data
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return _row_to_task(row)


def update_task(user_id: str, task_id: int, payload: TaskUpdate) -> Task:
    task = get_task(user_id, task_id)
    merged = task.model_dump()
    updates = payload.model_dump(exclude_unset=True)
    merged.update(updates)
    merged["updated_at"] = datetime.now(timezone.utc).isoformat()
    due_date = merged["due_date"].isoformat() if merged["due_date"] else None

    client = get_client()
    response = (
        client.table("tasks")
        .update(
            {
                "title": merged["title"],
                "description": merged["description"],
                "category": merged["category"],
                "priority": merged["priority"],
                "completed": merged["completed"],
                "due_date": due_date,
                "updated_at": merged["updated_at"],
            }
        )
        .eq("id", task_id)
        .eq("user_id", user_id)
        .execute()
    )
    rows = response.data or []
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return _row_to_task(rows[0])


def delete_task(user_id: str, task_id: int) -> None:
    get_task(user_id, task_id)
    client = get_client()
    client.table("tasks").delete().eq("id", task_id).eq("user_id", user_id).execute()


def get_summary(user_id: str) -> Summary:
    client = get_client()
    response = (
        client.table("tasks")
        .select("id, completed, priority")
        .eq("user_id", user_id)
        .execute()
    )
    rows = response.data or []
    total = len(rows)
    completed = sum(1 for row in rows if row.get("completed"))
    pending = total - completed
    high_priority = sum(1 for row in rows if row.get("priority") == "high")
    return Summary(total=total, completed=completed, pending=pending, high_priority=high_priority)
