from datetime import datetime, timezone

from fastapi import HTTPException, status

try:
    from .database import get_db
    from .schemas import Summary, Task, TaskCreate, TaskUpdate
except ImportError:
    from database import get_db
    from schemas import Summary, Task, TaskCreate, TaskUpdate


def _row_to_task(row) -> Task:
    return Task(
        id=row["id"],
        title=row["title"],
        description=row["description"],
        category=row["category"],
        priority=row["priority"],
        completed=bool(row["completed"]),
        due_date=row["due_date"],
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


def list_tasks() -> list[Task]:
    with get_db() as connection:
        rows = connection.execute("SELECT * FROM tasks ORDER BY completed ASC, id DESC").fetchall()
    return [_row_to_task(row) for row in rows]


def create_task(payload: TaskCreate) -> Task:
    now = datetime.now(timezone.utc).isoformat()
    due_date = payload.due_date.isoformat() if payload.due_date else None
    with get_db() as connection:
        cursor = connection.execute(
            """
            INSERT INTO tasks (title, description, category, priority, completed, due_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.title,
                payload.description,
                payload.category,
                payload.priority,
                int(payload.completed),
                due_date,
                now,
                now,
            ),
        )
        row = connection.execute("SELECT * FROM tasks WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return _row_to_task(row)


def get_task(task_id: int) -> Task:
    with get_db() as connection:
        row = connection.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return _row_to_task(row)


def update_task(task_id: int, payload: TaskUpdate) -> Task:
    task = get_task(task_id)
    merged = task.model_dump()
    updates = payload.model_dump(exclude_unset=True)
    merged.update(updates)
    merged["updated_at"] = datetime.now(timezone.utc).isoformat()
    due_date = merged["due_date"].isoformat() if merged["due_date"] else None

    with get_db() as connection:
        connection.execute(
            """
            UPDATE tasks
            SET title = ?, description = ?, category = ?, priority = ?, completed = ?, due_date = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                merged["title"],
                merged["description"],
                merged["category"],
                merged["priority"],
                int(merged["completed"]),
                due_date,
                merged["updated_at"],
                task_id,
            ),
        )
        row = connection.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return _row_to_task(row)


def delete_task(task_id: int) -> None:
    get_task(task_id)
    with get_db() as connection:
        connection.execute("DELETE FROM tasks WHERE id = ?", (task_id,))


def get_summary() -> Summary:
    with get_db() as connection:
        row = connection.execute(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) AS high_priority
            FROM tasks
            """
        ).fetchone()
    return Summary(
        total=row["total"] or 0,
        completed=row["completed"] or 0,
        pending=row["pending"] or 0,
        high_priority=row["high_priority"] or 0,
    )
