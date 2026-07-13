from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthContext, create_refresh_token, hash_refresh_token
from app.models.enums import WorkspaceRole
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceInvitation, WorkspaceMember
from app.schemas.workspace import (
    WorkspaceInvitationCreate,
    WorkspaceInvitationRead,
    WorkspaceMemberRead,
    WorkspaceSummary,
    WorkspaceUsage,
)
from app.services.plans import limits_for, require_capacity


async def list_workspaces(auth: AuthContext, session: AsyncSession) -> list[WorkspaceSummary]:
    rows = (
        await session.execute(
            select(Workspace, WorkspaceMember.role)
            .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
            .where(WorkspaceMember.user_id == auth.user_id)
            .order_by(Workspace.created_at)
        )
    ).all()
    return [
        WorkspaceSummary(
            id=workspace.id,
            name=workspace.name,
            role=WorkspaceRole(role),
            plan_code=workspace.plan_code,
        )
        for workspace, role in rows
    ]


async def get_usage(auth: AuthContext, session: AsyncSession) -> WorkspaceUsage:
    workspace = await _workspace(auth.workspace_id, session)
    limits = limits_for(workspace.plan_code)
    projects = await session.scalar(
        select(func.count(Project.id)).where(
            Project.workspace_id == auth.workspace_id,
            Project.archived_at.is_(None),
        )
    )
    tasks = await session.scalar(
        select(func.count(Task.id)).where(Task.workspace_id == auth.workspace_id)
    )
    members = await session.scalar(
        select(func.count(WorkspaceMember.id)).where(
            WorkspaceMember.workspace_id == auth.workspace_id
        )
    )
    return WorkspaceUsage(
        plan_code=workspace.plan_code,
        projects=projects or 0,
        project_limit=limits.projects,
        tasks=tasks or 0,
        task_limit=limits.tasks,
        members=members or 0,
        member_limit=limits.members,
    )


async def list_members(auth: AuthContext, session: AsyncSession) -> list[WorkspaceMemberRead]:
    rows = (
        await session.execute(
            select(User, WorkspaceMember)
            .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
            .where(WorkspaceMember.workspace_id == auth.workspace_id)
            .order_by(WorkspaceMember.created_at)
        )
    ).all()
    return [
        WorkspaceMemberRead(
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=WorkspaceRole(membership.role),
            joined_at=membership.created_at,
        )
        for user, membership in rows
    ]


async def create_invitation(
    request: WorkspaceInvitationCreate,
    auth: AuthContext,
    session: AsyncSession,
) -> WorkspaceInvitationRead:
    usage = await get_usage(auth, session)
    require_capacity("members", usage.members, usage.member_limit)
    existing_user = await session.scalar(
        select(User).where(func.lower(User.email) == request.email)
    )
    if existing_user:
        existing_member = await session.scalar(
            select(WorkspaceMember.id).where(
                WorkspaceMember.workspace_id == auth.workspace_id,
                WorkspaceMember.user_id == existing_user.id,
            )
        )
        if existing_member:
            raise HTTPException(status.HTTP_409_CONFLICT, "This person is already a member")

    pending = await session.scalar(
        select(WorkspaceInvitation).where(
            WorkspaceInvitation.workspace_id == auth.workspace_id,
            func.lower(WorkspaceInvitation.email) == request.email,
            WorkspaceInvitation.accepted_at.is_(None),
            WorkspaceInvitation.revoked_at.is_(None),
            WorkspaceInvitation.expires_at > datetime.now(UTC),
        )
    )
    if pending:
        raise HTTPException(status.HTTP_409_CONFLICT, "An active invitation already exists")

    raw_token = create_refresh_token()
    invitation = WorkspaceInvitation(
        workspace_id=auth.workspace_id,
        invited_by_id=auth.user_id,
        email=request.email,
        role=request.role,
        token_hash=hash_refresh_token(raw_token),
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    session.add(invitation)
    await session.commit()
    await session.refresh(invitation)
    return _invitation_read(invitation, raw_token)


async def list_invitations(
    auth: AuthContext, session: AsyncSession
) -> list[WorkspaceInvitationRead]:
    invitations = (
        await session.scalars(
            select(WorkspaceInvitation)
            .where(WorkspaceInvitation.workspace_id == auth.workspace_id)
            .order_by(WorkspaceInvitation.created_at.desc())
            .limit(50)
        )
    ).all()
    return [_invitation_read(invitation) for invitation in invitations]


async def revoke_invitation(
    invitation_id: str, auth: AuthContext, session: AsyncSession
) -> None:
    invitation = await session.scalar(
        select(WorkspaceInvitation).where(
            WorkspaceInvitation.id == invitation_id,
            WorkspaceInvitation.workspace_id == auth.workspace_id,
        )
    )
    if invitation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation not found")
    if invitation.accepted_at is None and invitation.revoked_at is None:
        invitation.revoked_at = datetime.now(UTC)
        await session.commit()


async def accept_invitation(
    raw_token: str, auth: AuthContext, session: AsyncSession
) -> WorkspaceSummary:
    invitation = await session.scalar(
        select(WorkspaceInvitation)
        .where(WorkspaceInvitation.token_hash == hash_refresh_token(raw_token))
        .with_for_update()
    )
    if (
        invitation is None
        or invitation.accepted_at is not None
        or invitation.revoked_at is not None
        or _as_utc(invitation.expires_at) <= datetime.now(UTC)
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation is invalid or expired")
    user = await session.get(User, auth.user_id)
    if user is None or user.email.lower() != invitation.email.lower():
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invitation email does not match this account")

    target_auth = AuthContext(user_id=auth.user_id, workspace_id=invitation.workspace_id)
    usage = await get_usage(target_auth, session)
    require_capacity("members", usage.members, usage.member_limit)
    existing = await session.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == invitation.workspace_id,
            WorkspaceMember.user_id == auth.user_id,
        )
    )
    if existing is None:
        session.add(
            WorkspaceMember(
                workspace_id=invitation.workspace_id,
                user_id=auth.user_id,
                role=invitation.role,
            )
        )
    invitation.accepted_at = datetime.now(UTC)
    await session.commit()
    workspace = await _workspace(invitation.workspace_id, session)
    return WorkspaceSummary(
        id=workspace.id,
        name=workspace.name,
        role=WorkspaceRole(invitation.role),
        plan_code=workspace.plan_code,
    )


async def update_member_role(
    user_id: str,
    role: WorkspaceRole,
    auth: AuthContext,
    session: AsyncSession,
) -> WorkspaceMemberRead:
    if user_id == auth.user_id:
        raise HTTPException(status.HTTP_409_CONFLICT, "You cannot change your own owner role")
    membership = await session.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == auth.workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    if membership is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace member not found")
    if WorkspaceRole(membership.role) == WorkspaceRole.owner or role == WorkspaceRole.owner:
        raise HTTPException(status.HTTP_409_CONFLICT, "Workspace ownership cannot be reassigned here")
    membership.role = role
    await session.commit()
    user = await session.get(User, user_id)
    return WorkspaceMemberRead(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=role,
        joined_at=membership.created_at,
    )


async def remove_member(user_id: str, auth: AuthContext, session: AsyncSession) -> None:
    if user_id == auth.user_id:
        raise HTTPException(status.HTTP_409_CONFLICT, "The workspace owner cannot remove themselves")
    membership = await session.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == auth.workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    if membership is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace member not found")
    if WorkspaceRole(membership.role) == WorkspaceRole.owner:
        raise HTTPException(status.HTTP_409_CONFLICT, "The workspace owner cannot be removed")
    await session.delete(membership)
    await session.commit()


async def _workspace(workspace_id: str, session: AsyncSession) -> Workspace:
    workspace = await session.get(Workspace, workspace_id)
    if workspace is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace not found")
    return workspace


def _invitation_read(
    invitation: WorkspaceInvitation, raw_token: str | None = None
) -> WorkspaceInvitationRead:
    return WorkspaceInvitationRead(
        id=invitation.id,
        email=invitation.email,
        role=WorkspaceRole(invitation.role),
        expires_at=invitation.expires_at,
        accepted_at=invitation.accepted_at,
        revoked_at=invitation.revoked_at,
        invite_token=raw_token,
    )


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
