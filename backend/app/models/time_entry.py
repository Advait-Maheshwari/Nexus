from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin, WorkspaceScopedMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.task import Task


class TimeEntry(IdMixin, TimestampMixin, WorkspaceScopedMixin, Base):
    __tablename__ = "time_entries"

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    task_id: Mapped[str | None] = mapped_column(ForeignKey("tasks.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source: Mapped[str] = mapped_column(String(60), default="manual", nullable=False)

    project: Mapped["Project"] = relationship(back_populates="time_entries")
    task: Mapped["Task"] = relationship(back_populates="time_entries")
