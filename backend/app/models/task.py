from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin, WorkspaceScopedMixin
from app.models.enums import Priority, WorkStatus

if TYPE_CHECKING:
    from app.models.feature import Feature
    from app.models.project import Project
    from app.models.time_entry import TimeEntry


class Task(IdMixin, TimestampMixin, WorkspaceScopedMixin, Base):
    __tablename__ = "tasks"

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    feature_id: Mapped[str | None] = mapped_column(ForeignKey("features.id"), index=True)
    parent_task_id: Mapped[str | None] = mapped_column(ForeignKey("tasks.id"), index=True)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[WorkStatus] = mapped_column(String(40), default=WorkStatus.backlog.value)
    priority: Mapped[Priority] = mapped_column(String(40), default=Priority.medium.value)
    estimate_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    time_spent_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    blocked_reason: Mapped[str | None] = mapped_column(Text)

    project: Mapped["Project"] = relationship(back_populates="tasks")
    feature: Mapped["Feature"] = relationship(back_populates="tasks")
    parent: Mapped["Task"] = relationship(remote_side="Task.id", back_populates="subtasks")
    subtasks: Mapped[list["Task"]] = relationship(back_populates="parent")
    dependencies: Mapped[list["TaskDependency"]] = relationship(
        foreign_keys="TaskDependency.task_id", back_populates="task"
    )
    time_entries: Mapped[list["TimeEntry"]] = relationship(back_populates="task")


class TaskDependency(IdMixin, TimestampMixin, Base):
    __tablename__ = "task_dependencies"
    __table_args__ = (UniqueConstraint("task_id", "depends_on_task_id", name="uq_task_dependency"),)

    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), index=True)
    depends_on_task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), index=True)

    task: Mapped["Task"] = relationship(foreign_keys=[task_id], back_populates="dependencies")
    depends_on_task: Mapped["Task"] = relationship(foreign_keys=[depends_on_task_id])
