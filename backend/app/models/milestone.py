from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin, WorkspaceScopedMixin
from app.models.enums import WorkStatus

if TYPE_CHECKING:
    from app.models.project import Project


class Milestone(IdMixin, TimestampMixin, WorkspaceScopedMixin, Base):
    __tablename__ = "milestones"

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[WorkStatus] = mapped_column(String(40), default=WorkStatus.backlog.value)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    project: Mapped["Project"] = relationship(back_populates="milestones")
