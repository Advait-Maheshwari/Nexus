import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.security import AuthContext
from app.models import Base
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.services.analytics import build_database_mission_control


@pytest.mark.asyncio
async def test_mission_control_uses_only_the_authenticated_workspace() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        owner = User(email="owner@nexus.dev", full_name="Nexus Owner")
        outsider = User(email="other@nexus.dev", full_name="Other Owner")
        workspace = Workspace(name="Nexus", slug="nexus")
        other_workspace = Workspace(name="Other", slug="other")
        session.add_all(
            [
                owner,
                outsider,
                workspace,
                other_workspace,
                WorkspaceMember(workspace=workspace, user=owner, role="owner"),
                WorkspaceMember(workspace=other_workspace, user=outsider, role="owner"),
            ]
        )
        await session.flush()
        nexus = Project(
            workspace_id=workspace.id,
            owner_id=owner.id,
            name="Nexus",
            codename="ORION",
            health_score=91,
        )
        hidden = Project(
            workspace_id=other_workspace.id,
            owner_id=outsider.id,
            name="Hidden Project",
            codename="PRIVATE",
        )
        session.add_all([nexus, hidden])
        await session.flush()
        session.add_all(
            [
                Task(
                    workspace_id=workspace.id,
                    project_id=nexus.id,
                    title="Complete session lifecycle",
                    status="done",
                    time_spent_minutes=90,
                ),
                Task(
                    workspace_id=workspace.id,
                    project_id=nexus.id,
                    title="Run deployment checks",
                    status="blocked",
                    time_spent_minutes=30,
                ),
                Task(
                    workspace_id=other_workspace.id,
                    project_id=hidden.id,
                    title="Private task",
                    status="in_progress",
                ),
            ]
        )
        await session.commit()

        summary = await build_database_mission_control(
            session,
            AuthContext(user_id=owner.id, workspace_id=workspace.id),
        )

        assert [project.name for project in summary.projects] == ["Nexus"]
        assert summary.projects[0].progress == 50
        assert summary.metrics[3].value == "1"
        assert summary.today_mission == ["Run deployment checks"]
        assert all("Hidden" not in item for item in summary.today_mission)
        assert all(
            action.project_name != "Hidden Project"
            for action in summary.execution_intelligence.next_actions
        )
        assert summary.execution_intelligence.forecast.completion_percent == 50

    await engine.dispose()
