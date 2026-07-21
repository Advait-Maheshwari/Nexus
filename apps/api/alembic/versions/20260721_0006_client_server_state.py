"""Move project execution state and preferences behind the server boundary.

Revision ID: 20260721_0006
Revises: 20260716_0005
Create Date: 2026-07-21
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "20260721_0006"
down_revision = "20260716_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    for name, default in (
        ("reduced_motion", sa.false()),
        ("compact_interface", sa.false()),
        ("auto_briefing", sa.true()),
    ):
        if name not in user_columns:
            op.add_column(
                "users",
                sa.Column(
                    name,
                    sa.Boolean(),
                    nullable=False,
                    server_default=default,
                ),
            )

    inspector = inspect(bind)
    if "project_blueprints" in inspector.get_table_names():
        return
    op.create_table(
        "project_blueprints",
        sa.Column("workspace_id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("vision", sa.Text(), nullable=False),
        sa.Column("definition_of_done", sa.Text(), nullable=False),
        sa.Column("strategy", sa.Text(), nullable=False),
        sa.Column("constraints", sa.JSON(), nullable=False),
        sa.Column("goals", sa.JSON(), nullable=False),
        sa.Column("steps", sa.JSON(), nullable=False),
        sa.Column("teams", sa.JSON(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", name="uq_project_blueprints_project_id"),
    )
    op.create_index(
        "ix_project_blueprints_workspace_id",
        "project_blueprints",
        ["workspace_id"],
    )
    op.create_index(
        "ix_project_blueprints_project_id",
        "project_blueprints",
        ["project_id"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "project_blueprints" in inspector.get_table_names():
        op.drop_table("project_blueprints")

    inspector = inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    for name in ("auto_briefing", "compact_interface", "reduced_motion"):
        if name in user_columns:
            op.drop_column("users", name)
