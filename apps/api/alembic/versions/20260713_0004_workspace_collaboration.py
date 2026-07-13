"""Add workspace collaboration and plan metadata.

Revision ID: 20260713_0004
Revises: 20260713_0003
Create Date: 2026-07-13
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "20260713_0004"
down_revision = "20260713_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    workspace_columns = {column["name"] for column in inspector.get_columns("workspaces")}
    if "plan_code" not in workspace_columns:
        op.add_column(
            "workspaces",
            sa.Column(
                "plan_code",
                sa.String(length=40),
                server_default="personal_free",
                nullable=False,
            ),
        )
    if "workspace_invitations" in inspector.get_table_names():
        return
    op.create_table(
        "workspace_invitations",
        sa.Column("workspace_id", sa.String(length=36), nullable=False),
        sa.Column("invited_by_id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["invited_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workspace_invitations_workspace_id", "workspace_invitations", ["workspace_id"])
    op.create_index("ix_workspace_invitations_invited_by_id", "workspace_invitations", ["invited_by_id"])
    op.create_index("ix_workspace_invitations_email", "workspace_invitations", ["email"])
    op.create_index(
        "ix_workspace_invitations_token_hash",
        "workspace_invitations",
        ["token_hash"],
        unique=True,
    )
    op.create_index("ix_workspace_invitations_expires_at", "workspace_invitations", ["expires_at"])


def downgrade() -> None:
    op.drop_table("workspace_invitations")
    op.drop_column("workspaces", "plan_code")
