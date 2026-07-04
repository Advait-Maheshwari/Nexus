from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin, WorkspaceScopedMixin

if TYPE_CHECKING:
    from app.models.project import Project


class JournalEntry(IdMixin, TimestampMixin, WorkspaceScopedMixin, Base):
    __tablename__ = "journal_entries"

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    mood: Mapped[str | None] = mapped_column(String(40))
    summary: Mapped[str | None] = mapped_column(Text)

    project: Mapped["Project"] = relationship(back_populates="journal_entries")
