from sqlalchemy import ForeignKey, Integer, JSON, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TimestampMixin, WorkspaceScopedMixin


class ProjectBlueprint(IdMixin, TimestampMixin, WorkspaceScopedMixin, Base):
    __tablename__ = "project_blueprints"
    __table_args__ = (UniqueConstraint("project_id", name="uq_project_blueprints_project_id"),)

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    vision: Mapped[str] = mapped_column(Text, nullable=False)
    definition_of_done: Mapped[str] = mapped_column(Text, nullable=False)
    strategy: Mapped[str] = mapped_column(Text, nullable=False)
    constraints: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    goals: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    steps: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    teams: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
