"""Add Firebase identity mapping.

Revision ID: 20260706_0002
Revises: 20260702_0001
Create Date: 2026-07-06
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "20260706_0002"
down_revision = "20260702_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("users")}
    indexes = {index["name"] for index in inspector.get_indexes("users")}

    if "firebase_uid" not in columns:
        op.add_column("users", sa.Column("firebase_uid", sa.String(length=128), nullable=True))
    if "ix_users_firebase_uid" not in indexes:
        op.create_index("ix_users_firebase_uid", "users", ["firebase_uid"], unique=True)


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("users")}
    indexes = {index["name"] for index in inspector.get_indexes("users")}

    if "ix_users_firebase_uid" in indexes:
        op.drop_index("ix_users_firebase_uid", table_name="users")
    if "firebase_uid" in columns:
        op.drop_column("users", "firebase_uid")
