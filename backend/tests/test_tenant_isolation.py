import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.security import AuthContext
from app.models import Base
from app.models.project import Project
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.planning import IdeaCreate
from app.services.database_planning import database_planning
from app.services.database_workspace import database_workspace


@pytest.mark.asyncio
async def test_projects_and_planning_records_are_isolated_by_workspace() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        user_a = User(email="alpha@nexus.dev", full_name="Alpha User")
        user_b = User(email="beta@nexus.dev", full_name="Beta User")
        workspace_a = Workspace(name="Alpha", slug="alpha")
        workspace_b = Workspace(name="Beta", slug="beta")
        session.add_all(
            [
                user_a,
                user_b,
                workspace_a,
                workspace_b,
                WorkspaceMember(workspace=workspace_a, user=user_a, role="owner"),
                WorkspaceMember(workspace=workspace_b, user=user_b, role="owner"),
            ]
        )
        await session.flush()
        project_a = Project(
            workspace_id=workspace_a.id,
            owner_id=user_a.id,
            name="Alpha Project",
            codename="ALPHA",
        )
        project_b = Project(
            workspace_id=workspace_b.id,
            owner_id=user_b.id,
            name="Beta Project",
            codename="BETA",
        )
        session.add_all([project_a, project_b])
        await session.commit()

        auth_a = AuthContext(user_id=user_a.id, workspace_id=workspace_a.id)
        projects = await database_workspace.list_projects(session, auth_a)
        assert [project.name for project in projects] == ["Alpha Project"]

        with pytest.raises(HTTPException) as raised:
            await database_planning.create_idea(
                session,
                auth_a,
                project_b.id,
                IdeaCreate(title="Cross-tenant idea"),
            )
        assert raised.value.status_code == 404

    await engine.dispose()
