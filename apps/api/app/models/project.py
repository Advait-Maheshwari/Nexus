from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin
from app.models.enums import Priority, WorkStatus

if TYPE_CHECKING:
    from app.models.activity_log import ActivityLog
    from app.models.ai_insight import AIInsight
    from app.models.feature import Feature
    from app.models.idea import Idea
    from app.models.journal import JournalEntry
    from app.models.milestone import Milestone
    from app.models.task import Task
    from app.models.time_entry import TimeEntry
    from app.models.user import User
    from app.models.workspace import Workspace


class Project(IdMixin, TimestampMixin, Base):
    __tablename__ = "projects"

    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    codename: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[WorkStatus] = mapped_column(String(40), default=WorkStatus.backlog.value)
    priority: Mapped[Priority] = mapped_column(String(40), default=Priority.medium.value)
    health_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    target_velocity: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    workspace: Mapped["Workspace"] = relationship(back_populates="projects")
    owner: Mapped["User"] = relationship(back_populates="owned_projects")
    features: Mapped[list["Feature"]] = relationship(back_populates="project")
    tasks: Mapped[list["Task"]] = relationship(back_populates="project")
    milestones: Mapped[list["Milestone"]] = relationship(back_populates="project")
    ideas: Mapped[list["Idea"]] = relationship(back_populates="project")
    journal_entries: Mapped[list["JournalEntry"]] = relationship(back_populates="project")
    time_entries: Mapped[list["TimeEntry"]] = relationship(back_populates="project")
    activity_logs: Mapped[list["ActivityLog"]] = relationship(back_populates="project")
    ai_insights: Mapped[list["AIInsight"]] = relationship(back_populates="project")
