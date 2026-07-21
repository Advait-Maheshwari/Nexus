from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin, WorkspaceScopedMixin
from app.models.enums import ActivityAction

if TYPE_CHECKING:
    from app.models.project import Project


class ActivityLog(IdMixin, TimestampMixin, WorkspaceScopedMixin, Base):
    __tablename__ = "activity_logs"

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[ActivityAction] = mapped_column(String(60), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSON)

    project: Mapped["Project"] = relationship(back_populates="activity_logs")
