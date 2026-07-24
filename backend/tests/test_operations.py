from datetime import UTC, datetime

import pytest
from fastapi import HTTPException
from jose import jwt
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import AuthContext
from app.models import Base
from app.models.enums import Priority, WorkspaceRole, WorkStatus
from app.schemas.auth import RegisterRequest
from app.schemas.operations import (
    AutomationRuleCreate,
    AutomationRuleUpdate,
    BriefingGenerateRequest,
)
from app.schemas.project import ProjectCreate
from app.schemas.task import TaskCreate
from app.services.database_auth import register_user
from app.services.database_workspace import database_workspace
from app.services.ai import AIProviderDisabledError, DisabledExternalPlanner
from app.services.operations import (
    create_automation_rule,
    delete_automation_rule,
    execute_automation_rule,
    generate_briefing_snapshot,
    get_operations_overview,
    preview_automation_rule,
    provider_statuses,
    update_automation_rule,
)


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
async def test_operational_briefings_and_automation_are_tenant_scoped_and_audited() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        first_issue = await register_user(
            RegisterRequest(
                email="operator@nexus.dev",
                full_name="Nexus Operator",
                password="secure-password-7",
            ),
            session,
        )
        second_issue = await register_user(
            RegisterRequest(
                email="other@nexus.dev",
                full_name="Other Operator",
                password="secure-password-8",
            ),
            session,
        )
        first_auth = _auth(first_issue.token.access_token)
        second_auth = _auth(second_issue.token.access_token)

        project = await database_workspace.create_project(
            session,
            first_auth,
            ProjectCreate(
                name="Nexus",
                codename="NX",
                priority=Priority.high,
                status=WorkStatus.in_progress,
            ),
        )
        await database_workspace.create_task(
            session,
            first_auth,
            project.id,
            TaskCreate(
                title="Ship operational intelligence",
                priority=Priority.critical,
                status=WorkStatus.in_progress,
                estimate_minutes=180,
            ),
        )

        daily = await generate_briefing_snapshot(
            session,
            first_auth,
            BriefingGenerateRequest(briefing_type="daily"),
        )
        same_daily = await generate_briefing_snapshot(
            session,
            first_auth,
            BriefingGenerateRequest(briefing_type="daily"),
        )
        assert daily.id == same_daily.id
        assert daily.content.next_task == "Ship operational intelligence"

        rule = await create_automation_rule(
            session,
            first_auth,
            AutomationRuleCreate(
                name="Weekly command review",
                briefing_type="weekly",
                cadence="weekly",
            ),
        )
        assert rule.enabled is False
        fixed_now = datetime(2026, 7, 24, 9, 0, tzinfo=UTC)
        disabled_preview = await preview_automation_rule(
            session,
            first_auth,
            rule.id,
            now=fixed_now,
        )
        assert disabled_preview.due is False
        assert "Enable" in disabled_preview.reason

        rule = await update_automation_rule(
            session,
            first_auth,
            rule.id,
            AutomationRuleUpdate(enabled=True),
        )
        assert rule.enabled is True
        preview = await preview_automation_rule(
            session,
            first_auth,
            rule.id,
            now=fixed_now,
        )
        assert preview.due is True
        assert preview.would_create_snapshot is True

        with pytest.raises(HTTPException) as confirmation_error:
            await execute_automation_rule(
                session,
                first_auth,
                rule.id,
                confirm=False,
                now=fixed_now,
            )
        assert confirmation_error.value.status_code == 422

        run = await execute_automation_rule(
            session,
            first_auth,
            rule.id,
            confirm=True,
            now=fixed_now,
        )
        assert run.status == "completed"
        assert run.output_snapshot_id
        assert run.decision["mutated_project_data"] is False
        assert run.decision["confirmation_recorded"] is True

        with pytest.raises(HTTPException) as repeat_error:
            await execute_automation_rule(
                session,
                first_auth,
                rule.id,
                confirm=True,
                now=fixed_now,
            )
        assert repeat_error.value.status_code == 409

        first_overview = await get_operations_overview(session, first_auth)
        second_overview = await get_operations_overview(session, second_auth)
        assert len(first_overview.snapshots) == 2
        assert len(first_overview.rules) == 1
        assert len(first_overview.recent_runs) == 1
        assert second_overview.snapshots == []
        assert second_overview.rules == []
        assert second_overview.recent_runs == []

        with pytest.raises(HTTPException) as tenant_error:
            await preview_automation_rule(session, second_auth, rule.id, now=fixed_now)
        assert tenant_error.value.status_code == 404

        await delete_automation_rule(session, first_auth, rule.id)
        deleted_overview = await get_operations_overview(session, first_auth)
        assert deleted_overview.rules == []
        assert deleted_overview.recent_runs == []

    await engine.dispose()


def test_external_provider_status_never_exposes_keys_and_stays_disabled() -> None:
    statuses = provider_statuses()

    assert statuses[0].provider == "local"
    assert statuses[0].enabled is True
    assert all(status.enabled is False for status in statuses[1:])
    assert all("key" not in status.model_dump() for status in statuses)


@pytest.mark.asyncio
async def test_external_provider_adapter_fails_closed_without_network_execution() -> None:
    adapter = DisabledExternalPlanner("openai", configured=True)

    with pytest.raises(AIProviderDisabledError, match="execution is disabled"):
        await adapter.generate_daily_briefing("user-id")
