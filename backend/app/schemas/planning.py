from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import WorkStatus


class IdeaCreate(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    body: str | None = Field(default=None, max_length=10_000)
    score: int = Field(default=0, ge=0, le=100)
    source: str | None = Field(default=None, max_length=80)


class IdeaRead(IdeaCreate):
    id: str
    workspace_id: str
    project_id: str
    created_at: datetime


class JournalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    body: str = Field(min_length=1, max_length=50_000)
    mood: str | None = Field(default=None, max_length=40)


class JournalRead(JournalCreate):
    id: str
    workspace_id: str
    project_id: str
    summary: str | None
    created_at: datetime


class MilestoneCreate(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    description: str | None = Field(default=None, max_length=10_000)
    due_date: datetime | None = None


class MilestoneUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = Field(default=None, max_length=10_000)
    status: WorkStatus | None = None
    due_date: datetime | None = None


class MilestoneRead(BaseModel):
    id: str
    workspace_id: str
    project_id: str
    title: str
    description: str | None
    status: WorkStatus
    due_date: datetime | None
    completed_at: datetime | None
    created_at: datetime
