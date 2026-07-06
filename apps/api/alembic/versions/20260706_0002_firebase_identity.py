"""Add Firebase identity mapping.

Revision ID: 20260706_0002
Revises: 20260702_0001
Create Date: 2026-07-06
"""

import sqlalchemy as sa
from alembic import op

revision = "20260706_0002"
down_revision = "20260702_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("firebase_uid", sa.String(length=128), nullable=True))
    op.create_index("ix_users_firebase_uid", "users", ["firebase_uid"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_firebase_uid", table_name="users")
    op.drop_column("users", "firebase_uid")
