from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import Priority, WorkStatus


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=220)
    description: str | None = None
    feature_id: str | None = None
    parent_task_id: str | None = None
    priority: Priority = Priority.medium
    estimate_minutes: int = Field(default=60, ge=0)
    due_date: datetime | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=220)
    description: str | None = None
    status: WorkStatus | None = None
    priority: Priority | None = None
    estimate_minutes: int | None = Field(default=None, ge=0)
    time_spent_minutes: int | None = Field(default=None, ge=0)
    due_date: datetime | None = None
    blocked_reason: str | None = None


class TaskRead(BaseModel):
    id: str
    workspace_id: str
    project_id: str
    feature_id: str | None
    parent_task_id: str | None
    title: str
    description: str | None
    status: WorkStatus
    priority: Priority
    estimate_minutes: int
    time_spent_minutes: int
    due_date: datetime | None
    blocked_reason: str | None

