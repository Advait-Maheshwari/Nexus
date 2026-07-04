from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin, WorkspaceScopedMixin
from app.models.enums import Priority, WorkStatus

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.task import Task


class Feature(IdMixin, TimestampMixin, WorkspaceScopedMixin, Base):
    __tablename__ = "features"

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[WorkStatus] = mapped_column(String(40), default=WorkStatus.backlog.value)
    priority: Mapped[Priority] = mapped_column(String(40), default=Priority.medium.value)
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    project: Mapped["Project"] = relationship(back_populates="features")
    tasks: Mapped[list["Task"]] = relationship(back_populates="feature")
