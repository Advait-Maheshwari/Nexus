"""Add verified email state and account action tokens.

Revision ID: 20260716_0005
Revises: 20260713_0004
Create Date: 2026-07-16
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "20260716_0005"
down_revision = "20260713_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "email_verified_at" not in user_columns:
        op.add_column("users", sa.Column("email_verified_at", sa.DateTime(timezone=True)))
        op.execute(
            sa.text(
                "UPDATE users SET email_verified_at = CURRENT_TIMESTAMP "
                "WHERE email_verified_at IS NULL"
            )
        )

    inspector = inspect(bind)
    if "account_action_tokens" in inspector.get_table_names():
        return
    op.create_table(
        "account_action_tokens",
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("purpose", sa.String(length=40), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True)),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_account_action_tokens_user_id", "account_action_tokens", ["user_id"])
    op.create_index("ix_account_action_tokens_purpose", "account_action_tokens", ["purpose"])
    op.create_index(
        "ix_account_action_tokens_token_hash",
        "account_action_tokens",
        ["token_hash"],
        unique=True,
    )
    op.create_index("ix_account_action_tokens_expires_at", "account_action_tokens", ["expires_at"])


def downgrade() -> None:
    op.drop_table("account_action_tokens")
    op.drop_column("users", "email_verified_at")
