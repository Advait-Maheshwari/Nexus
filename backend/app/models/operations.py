from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TimestampMixin


class BriefingSnapshot(IdMixin, TimestampMixin, Base):
    __tablename__ = "briefing_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "briefing_type",
            "period_key",
            name="uq_briefing_snapshot_period",
        ),
    )

    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
    )
    created_by_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    briefing_type: Mapped[str] = mapped_column(String(20), index=True)
    period_key: Mapped[str] = mapped_column(String(20), index=True)
    provider: Mapped[str] = mapped_column(String(80), nullable=False)
    source_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)


class AutomationRule(IdMixin, TimestampMixin, Base):
    __tablename__ = "automation_rules"
    __table_args__ = (
        UniqueConstraint("workspace_id", "name", name="uq_automation_rule_name"),
    )

    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
    )
    created_by_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    briefing_type: Mapped[str] = mapped_column(String(20), nullable=False)
    cadence: Mapped[str] = mapped_column(String(20), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    max_runs_per_period: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    configuration: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class AutomationRun(IdMixin, TimestampMixin, Base):
    __tablename__ = "automation_runs"

    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
    )
    rule_id: Mapped[str] = mapped_column(
        ForeignKey("automation_rules.id", ondelete="CASCADE"),
        index=True,
    )
    actor_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), index=True)
    period_key: Mapped[str] = mapped_column(String(20), index=True)
    output_snapshot_id: Mapped[str | None] = mapped_column(
        ForeignKey("briefing_snapshots.id", ondelete="SET NULL"),
        index=True,
    )
    decision: Mapped[dict] = mapped_column(JSON, nullable=False)
