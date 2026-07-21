import pytest
from fastapi import HTTPException
from jose import jwt
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import AuthContext
from app.models import Base
from app.models.enums import WorkspaceRole
from app.schemas.auth import RegisterRequest
from app.schemas.configuration import ProjectTeam, UserPreferencesWrite
from app.schemas.project import ProjectCreate
from app.schemas.task import TaskCreate
from app.services.configuration_defaults import default_blueprint
from app.services.database_auth import register_user
from app.services.database_configuration import database_configuration
from app.services.database_workspace import database_workspace


def _auth(access_token: str) -> AuthContext:
    claims = jwt.decode(
        access_token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        audience=settings.jwt_audience,
        issuer=settings.jwt_issuer,
    )
    return AuthContext(
        user_id=claims["sub"],
        workspace_id=claims["workspace_id"],
        role=WorkspaceRole(claims["role"]),
        session_id=claims["sid"],
    )


@pytest.mark.asyncio
async def test_blueprints_and_preferences_are_server_owned_and_tenant_scoped() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        first_issue = await register_user(
            RegisterRequest(
                email="first@nexus.dev",
                full_name="First Owner",
                password="secure-password-7",
            ),
            session,
        )
        second_issue = await register_user(
            RegisterRequest(
                email="second@nexus.dev",
                full_name="Second Owner",
                password="secure-password-8",
            ),
            session,
        )
        first_auth = _auth(first_issue.token.access_token)
        second_auth = _auth(second_issue.token.access_token)

        first_project = await database_workspace.create_project(
            session,
            first_auth,
            ProjectCreate(name="Nexus", codename="NX"),
        )
        second_project = await database_workspace.create_project(
            session,
            second_auth,
            ProjectCreate(name="Other", codename="OT"),
        )
        first_task = await database_workspace.create_task(
            session,
            first_auth,
            first_project.id,
            TaskCreate(title="Server-owned task"),
        )
        second_task = await database_workspace.create_task(
            session,
            second_auth,
            second_project.id,
            TaskCreate(title="Foreign task"),
        )

        initial = await database_configuration.get_blueprint(
            session,
            first_auth,
            first_project.id,
        )
        assert initial.project_id == first_project.id
        assert initial.version == 0
        assert "zero-cost" in initial.vision

        write = default_blueprint("Nexus")
        write.teams = [
            ProjectTeam(
                id="platform",
                name="Platform",
                lead="Owner",
                responsibility="Own server delivery",
                task_ids=[first_task.id],
            )
        ]
        saved = await database_configuration.update_blueprint(
            session,
            first_auth,
            first_project.id,
            write,
        )
        assert saved.version == 1
        assert saved.teams[0].task_ids == [first_task.id]

        with pytest.raises(HTTPException) as conflict_error:
            await database_configuration.update_blueprint(
                session,
                first_auth,
                first_project.id,
                write,
            )
        assert conflict_error.value.status_code == 409

        write.version = saved.version
        write.teams[0].task_ids = [second_task.id]
        with pytest.raises(HTTPException) as assignment_error:
            await database_configuration.update_blueprint(
                session,
                first_auth,
                first_project.id,
                write,
            )
        assert assignment_error.value.status_code == 422

        with pytest.raises(HTTPException) as tenant_error:
            await database_configuration.get_blueprint(
                session,
                second_auth,
                first_project.id,
            )
        assert tenant_error.value.status_code == 404

        first_preferences = await database_configuration.update_preferences(
            session,
            first_auth,
            UserPreferencesWrite(
                reduced_motion=True,
                compact_interface=True,
                auto_briefing=False,
            ),
        )
        second_preferences = await database_configuration.get_preferences(
            session,
            second_auth,
        )
        assert first_preferences.reduced_motion is True
        assert first_preferences.auto_briefing is False
        assert second_preferences.reduced_motion is False
        assert second_preferences.auto_briefing is True

    await engine.dispose()
