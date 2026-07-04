from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import Priority, WorkStatus


class FeatureCreate(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    description: str | None = None
    priority: Priority = Priority.medium
    deadline: datetime | None = None


class FeatureUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = None
    status: WorkStatus | None = None
    priority: Priority | None = None
    progress: float | None = Field(default=None, ge=0, le=100)
    deadline: datetime | None = None


class FeatureRead(BaseModel):
    id: str
    workspace_id: str
    project_id: str
    title: str
    description: str | None
    status: WorkStatus
    priority: Priority
    progress: float
    deadline: datetime | None
    task_count: int = 0
    blocked_task_count: int = 0

