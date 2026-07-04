from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin, WorkspaceScopedMixin

if TYPE_CHECKING:
    from app.models.project import Project


class Idea(IdMixin, TimestampMixin, WorkspaceScopedMixin, Base):
    __tablename__ = "ideas"

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    body: Mapped[str | None] = mapped_column(Text)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    source: Mapped[str | None] = mapped_column(String(80))
    converted_task_id: Mapped[str | None] = mapped_column(ForeignKey("tasks.id"))

    project: Mapped["Project"] = relationship(back_populates="ideas")
