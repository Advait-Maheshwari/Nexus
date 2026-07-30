from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import AuthContext, require_auth_context, require_workspace_owner
from app.models.user import User
from app.models.user_session import UserSession
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.admin import (
    AdminSessionSummary,
    AdminWorkspaceDashboard,
    AdminWorkspaceUser,
)

router = APIRouter()


@router.get("/workspace", response_model=AdminWorkspaceDashboard)
async def workspace_admin_dashboard(
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> AdminWorkspaceDashboard:
    require_workspace_owner(auth)

    workspace = await session.get(Workspace, auth.workspace_id)
    if workspace is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace was not found")

    now = datetime.now(UTC)
    member_rows = (
        await session.execute(
            select(User, WorkspaceMember)
            .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
            .where(WorkspaceMember.workspace_id == auth.workspace_id)
            .order_by(WorkspaceMember.created_at.asc())
        )
    ).all()
    user_ids = [user.id for user, _membership in member_rows]

    session_stats = {
        row.user_id: {
            "last_login_at": row.last_login_at,
            "active_session_count": int(row.active_session_count or 0),
            "total_session_count": int(row.total_session_count or 0),
        }
        for row in (
            await session.execute(
                select(
                    UserSession.user_id.label("user_id"),
                    func.max(UserSession.created_at).label("last_login_at"),
                    func.coalesce(func.sum(_active_session_case(now)), 0).label(
                        "active_session_count"
                    ),
                    func.count(UserSession.id).label("total_session_count"),
                )
                .where(
                    UserSession.workspace_id == auth.workspace_id,
                    UserSession.user_id.in_(user_ids or [""]),
                )
                .group_by(UserSession.user_id)
            )
        ).all()
    }

    active_sessions = (
        await session.scalars(
            select(UserSession)
            .where(
                UserSession.workspace_id == auth.workspace_id,
                UserSession.user_id.in_(user_ids or [""]),
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > now,
            )
            .order_by(UserSession.created_at.desc())
        )
    ).all()

    users = [
        AdminWorkspaceUser(
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            avatar_url=user.avatar_url,
            role=membership.role.value
            if hasattr(membership.role, "value")
            else str(membership.role),
            joined_at=membership.created_at,
            account_created_at=user.created_at,
            account_updated_at=user.updated_at,
            is_active=user.is_active,
            email_verified=user.email_verified_at is not None,
            password_enabled=user.password_hash is not None,
            google_enabled=user.firebase_uid is not None,
            last_login_at=session_stats.get(user.id, {}).get("last_login_at"),
            active_session_count=session_stats.get(user.id, {}).get("active_session_count", 0),
            total_session_count=session_stats.get(user.id, {}).get("total_session_count", 0),
        )
        for user, membership in member_rows
    ]

    return AdminWorkspaceDashboard(
        workspace_id=workspace.id,
        workspace_name=workspace.name,
        generated_at=now,
        total_users=len(users),
        active_session_count=len(active_sessions),
        users=users,
        active_sessions=[
            AdminSessionSummary(
                id=stored.id,
                user_id=stored.user_id,
                created_at=stored.created_at,
                expires_at=stored.expires_at,
                revoked_at=stored.revoked_at,
                active=True,
                current=stored.id == auth.session_id,
            )
            for stored in active_sessions
        ],
    )


def _active_session_case(now: datetime):
    return case(
        (
            and_(
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > now,
            ),
            1,
        ),
        else_=0,
    )
