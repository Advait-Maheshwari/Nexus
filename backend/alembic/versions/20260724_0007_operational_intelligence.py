"""Add operational briefings and auditable automation receipts.

Revision ID: 20260724_0007
Revises: 20260721_0006
Create Date: 2026-07-24
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "20260724_0007"
down_revision = "20260721_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    tables = set(inspector.get_table_names())

    if "briefing_snapshots" not in tables:
        op.create_table(
            "briefing_snapshots",
            sa.Column("workspace_id", sa.String(length=36), nullable=False),
            sa.Column("created_by_id", sa.String(length=36)),
            sa.Column("briefing_type", sa.String(length=20), nullable=False),
            sa.Column("period_key", sa.String(length=20), nullable=False),
            sa.Column("provider", sa.String(length=80), nullable=False),
            sa.Column("source_fingerprint", sa.String(length=64), nullable=False),
            sa.Column("content", sa.JSON(), nullable=False),
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(
                ["workspace_id"],
                ["workspaces.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["created_by_id"],
                ["users.id"],
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "workspace_id",
                "briefing_type",
                "period_key",
                name="uq_briefing_snapshot_period",
            ),
        )
        for column in ("workspace_id", "created_by_id", "briefing_type", "period_key"):
            op.create_index(
                f"ix_briefing_snapshots_{column}",
                "briefing_snapshots",
                [column],
            )

    if "automation_rules" not in tables:
        op.create_table(
            "automation_rules",
            sa.Column("workspace_id", sa.String(length=36), nullable=False),
            sa.Column("created_by_id", sa.String(length=36)),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("briefing_type", sa.String(length=20), nullable=False),
            sa.Column("cadence", sa.String(length=20), nullable=False),
            sa.Column(
                "enabled",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
            sa.Column(
                "max_runs_per_period",
                sa.Integer(),
                nullable=False,
                server_default="1",
            ),
            sa.Column("last_run_at", sa.DateTime(timezone=True)),
            sa.Column("configuration", sa.JSON(), nullable=False),
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(
                ["workspace_id"],
                ["workspaces.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["created_by_id"],
                ["users.id"],
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "workspace_id",
                "name",
                name="uq_automation_rule_name",
            ),
        )
        for column in ("workspace_id", "created_by_id", "last_run_at"):
            op.create_index(
                f"ix_automation_rules_{column}",
                "automation_rules",
                [column],
            )

    inspector = inspect(op.get_bind())
    if "automation_runs" not in inspector.get_table_names():
        op.create_table(
            "automation_runs",
            sa.Column("workspace_id", sa.String(length=36), nullable=False),
            sa.Column("rule_id", sa.String(length=36), nullable=False),
            sa.Column("actor_id", sa.String(length=36)),
            sa.Column("mode", sa.String(length=20), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("period_key", sa.String(length=20), nullable=False),
            sa.Column("output_snapshot_id", sa.String(length=36)),
            sa.Column("decision", sa.JSON(), nullable=False),
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(
                ["workspace_id"],
                ["workspaces.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["rule_id"],
                ["automation_rules.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["actor_id"],
                ["users.id"],
                ondelete="SET NULL",
            ),
            sa.ForeignKeyConstraint(
                ["output_snapshot_id"],
                ["briefing_snapshots.id"],
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        for column in (
            "workspace_id",
            "rule_id",
            "actor_id",
            "status",
            "period_key",
            "output_snapshot_id",
        ):
            op.create_index(
                f"ix_automation_runs_{column}",
                "automation_runs",
                [column],
            )


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    if "automation_runs" in tables:
        op.drop_table("automation_runs")
    if "automation_rules" in tables:
        op.drop_table("automation_rules")
    if "briefing_snapshots" in tables:
        op.drop_table("briefing_snapshots")
