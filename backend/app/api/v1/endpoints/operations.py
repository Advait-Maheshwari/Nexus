from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security import (
    AuthContext,
    require_auth_context,
    require_workspace_admin,
    require_workspace_editor,
)
from app.schemas.operations import (
    AutomationExecuteRequest,
    AutomationPreviewRead,
    AutomationRuleCreate,
    AutomationRuleRead,
    AutomationRuleUpdate,
    AutomationRunRead,
    BriefingGenerateRequest,
    BriefingSnapshotRead,
    OperationsOverview,
)
from app.services.operations import (
    create_automation_rule,
    delete_automation_rule,
    execute_automation_rule,
    generate_briefing_snapshot,
    get_operations_overview,
    preview_automation_rule,
    update_automation_rule,
)

router = APIRouter()


def _require_database_mode() -> None:
    if settings.auth_backend != "database":
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Operational intelligence requires the database auth backend",
        )


@router.get("", response_model=OperationsOverview)
async def operations_overview(
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> OperationsOverview:
    _require_database_mode()
    return await get_operations_overview(session, auth)


@router.post(
    "/briefings",
    response_model=BriefingSnapshotRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_briefing(
    request: BriefingGenerateRequest,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> BriefingSnapshotRead:
    _require_database_mode()
    require_workspace_editor(auth)
    return await generate_briefing_snapshot(session, auth, request)


@router.post(
    "/automation-rules",
    response_model=AutomationRuleRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_rule(
    request: AutomationRuleCreate,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> AutomationRuleRead:
    _require_database_mode()
    require_workspace_admin(auth)
    return await create_automation_rule(session, auth, request)


@router.patch("/automation-rules/{rule_id}", response_model=AutomationRuleRead)
async def patch_rule(
    rule_id: str,
    request: AutomationRuleUpdate,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> AutomationRuleRead:
    _require_database_mode()
    require_workspace_admin(auth)
    return await update_automation_rule(session, auth, rule_id, request)


@router.delete(
    "/automation-rules/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_rule(
    rule_id: str,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> None:
    _require_database_mode()
    require_workspace_admin(auth)
    await delete_automation_rule(session, auth, rule_id)


@router.post(
    "/automation-rules/{rule_id}/preview",
    response_model=AutomationPreviewRead,
)
async def preview_rule(
    rule_id: str,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> AutomationPreviewRead:
    _require_database_mode()
    require_workspace_admin(auth)
    return await preview_automation_rule(session, auth, rule_id)


@router.post(
    "/automation-rules/{rule_id}/execute",
    response_model=AutomationRunRead,
)
async def execute_rule(
    rule_id: str,
    request: AutomationExecuteRequest,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> AutomationRunRead:
    _require_database_mode()
    require_workspace_admin(auth)
    return await execute_automation_rule(
        session,
        auth,
        rule_id,
        confirm=request.confirm,
    )
