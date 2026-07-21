import os

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.security import AuthContext
from app.models import Base
from app.models.project import Project
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.services.database_workspace import database_workspace

DATABASE_URL = os.getenv("NEXUS_TEST_DATABASE_URL")


@pytest.mark.skipif(not DATABASE_URL, reason="Live PostgreSQL test URL is not configured")
@pytest.mark.asyncio
async def test_live_postgres_enforces_workspace_project_isolation() -> None:
    engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        alpha = User(email="alpha@postgres.test", full_name="Alpha Owner")
        beta = User(email="beta@postgres.test", full_name="Beta Owner")
        alpha_workspace = Workspace(name="Alpha", slug="alpha-live")
        beta_workspace = Workspace(name="Beta", slug="beta-live")
        session.add_all(
            [
                alpha,
                beta,
                alpha_workspace,
                beta_workspace,
                WorkspaceMember(workspace=alpha_workspace, user=alpha, role="owner"),
                WorkspaceMember(workspace=beta_workspace, user=beta, role="owner"),
            ]
        )
        await session.flush()
        session.add_all(
            [
                Project(
                    workspace_id=alpha_workspace.id,
                    owner_id=alpha.id,
                    name="Alpha Project",
                    codename="ALPHA",
                ),
                Project(
                    workspace_id=beta_workspace.id,
                    owner_id=beta.id,
                    name="Beta Project",
                    codename="BETA",
                ),
            ]
        )
        await session.commit()

        projects = await database_workspace.list_projects(
            session,
            AuthContext(user_id=alpha.id, workspace_id=alpha_workspace.id),
        )
        assert [project.name for project in projects] == ["Alpha Project"]

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
    await engine.dispose()
