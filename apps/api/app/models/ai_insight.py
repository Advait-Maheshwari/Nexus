from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin, WorkspaceScopedMixin

if TYPE_CHECKING:
    from app.models.project import Project


class AIInsight(IdMixin, TimestampMixin, WorkspaceScopedMixin, Base):
    __tablename__ = "ai_insights"

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    provider: Mapped[str] = mapped_column(String(80), nullable=False)
    insight_type: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    input_fingerprint: Mapped[str | None] = mapped_column(String(128), index=True)
    payload: Mapped[dict | None] = mapped_column(JSON)

    project: Mapped["Project"] = relationship(back_populates="ai_insights")
