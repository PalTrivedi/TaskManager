from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


Priority = Literal["low", "medium", "high"]


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    description: str = Field(default="", max_length=600)
    category: str = Field(default="Personal", min_length=1, max_length=40)
    priority: Priority = "medium"
    completed: bool = False
    due_date: date | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=600)
    category: str | None = Field(default=None, min_length=1, max_length=40)
    priority: Priority | None = None
    completed: bool | None = None
    due_date: date | None = None


class Task(TaskBase):
    id: int
    user_id: str
    created_at: datetime
    updated_at: datetime


class Summary(BaseModel):
    total: int
    completed: int
    pending: int
    high_priority: int
