from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import (
    AuthContext,
    require_auth_context,
    require_workspace_admin,
    require_workspace_owner,
)
from app.core.session_cookie import set_refresh_cookie
from app.schemas.auth import TokenResponse
from app.schemas.workspace import (
    WorkspaceInvitationAccept,
    WorkspaceInvitationCreate,
    WorkspaceInvitationRead,
    WorkspaceMemberRead,
    WorkspaceMemberUpdate,
    WorkspaceSummary,
    WorkspaceSwitchRequest,
    WorkspaceUsage,
)
from app.services.database_auth import issue_workspace_session
from app.services.workspace_collaboration import (
    accept_invitation,
    create_invitation,
    get_usage,
    list_invitations,
    list_members,
    list_workspaces,
    remove_member,
    revoke_invitation,
    update_member_role,
)

router = APIRouter()


@router.get("", response_model=list[WorkspaceSummary])
async def workspace_list(
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> list[WorkspaceSummary]:
    return await list_workspaces(auth, session)


@router.post("/switch", response_model=TokenResponse)
async def switch_workspace(
    request: WorkspaceSwitchRequest,
    response: Response,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    issued = await issue_workspace_session(auth, request.workspace_id, session)
    set_refresh_cookie(response, issued.refresh_token)
    return issued.token


@router.get("/usage", response_model=WorkspaceUsage)
async def workspace_usage(
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> WorkspaceUsage:
    return await get_usage(auth, session)


@router.get("/members", response_model=list[WorkspaceMemberRead])
async def workspace_members(
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> list[WorkspaceMemberRead]:
    return await list_members(auth, session)


@router.patch("/members/{user_id}", response_model=WorkspaceMemberRead)
async def patch_workspace_member(
    user_id: str,
    request: WorkspaceMemberUpdate,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> WorkspaceMemberRead:
    require_workspace_owner(auth)
    return await update_member_role(user_id, request.role, auth, session)


@router.delete("/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_member(
    user_id: str,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> Response:
    require_workspace_owner(auth)
    await remove_member(user_id, auth, session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/invitations", response_model=list[WorkspaceInvitationRead])
async def workspace_invitations(
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> list[WorkspaceInvitationRead]:
    require_workspace_admin(auth)
    return await list_invitations(auth, session)


@router.post(
    "/invitations",
    response_model=WorkspaceInvitationRead,
    status_code=status.HTTP_201_CREATED,
)
async def invite_workspace_member(
    request: WorkspaceInvitationCreate,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> WorkspaceInvitationRead:
    require_workspace_admin(auth)
    return await create_invitation(request, auth, session)


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_invitation(
    invitation_id: str,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> Response:
    require_workspace_admin(auth)
    await revoke_invitation(invitation_id, auth, session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/invitations/accept", response_model=WorkspaceSummary)
async def accept_workspace_invitation(
    request: WorkspaceInvitationAccept,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> WorkspaceSummary:
    return await accept_invitation(request.invite_token, auth, session)
