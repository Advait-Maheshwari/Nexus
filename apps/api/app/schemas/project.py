from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import Priority, ProjectHealth, WorkStatus


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    codename: str = Field(min_length=1, max_length=80)
    description: str | None = None
    priority: Priority = Priority.medium
    deadline: datetime | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=180)
    codename: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = None
    status: WorkStatus | None = None
    priority: Priority | None = None
    health_score: float | None = Field(default=None, ge=0, le=100)
    deadline: datetime | None = None


class ProjectRead(BaseModel):
    id: str
    workspace_id: str
    name: str
    codename: str
    description: str | None
    status: WorkStatus
    priority: Priority
    health_score: float
    progress: float = 0
    deadline: datetime | None


class ProjectSummary(BaseModel):
    id: str
    name: str
    codename: str
    status: WorkStatus
    health: ProjectHealth
    health_score: float
    progress: float
    priority: Priority
    deadline: str | None = None
    time_spent_minutes: int
    velocity: float
    feature_count: int
    task_count: int
    blocked_task_count: int
