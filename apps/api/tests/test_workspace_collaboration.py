import pytest
from jose import jwt
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import AuthContext
from app.models import Base
from app.models.enums import WorkspaceRole
from app.schemas.auth import RegisterRequest
from app.schemas.workspace import WorkspaceInvitationCreate
from app.services.database_auth import issue_workspace_session, register_user
from app.services.workspace_collaboration import (
    accept_invitation,
    create_invitation,
    get_usage,
    list_members,
    list_workspaces,
    update_member_role,
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
async def test_invitation_membership_roles_and_workspace_switching() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        owner_issue = await register_user(
            RegisterRequest(
                email="owner@nexus.dev",
                full_name="Nexus Owner",
                password="secure-password-7",
            ),
            session,
        )
        guest_issue = await register_user(
            RegisterRequest(
                email="guest@nexus.dev",
                full_name="Nexus Guest",
                password="secure-password-8",
            ),
            session,
        )
        owner_auth = _auth(owner_issue.token.access_token)
        guest_auth = _auth(guest_issue.token.access_token)

        invitation = await create_invitation(
            WorkspaceInvitationCreate(email="guest@nexus.dev", role=WorkspaceRole.member),
            owner_auth,
            session,
        )
        assert invitation.invite_token
        accepted = await accept_invitation(invitation.invite_token, guest_auth, session)
        assert accepted.id == owner_auth.workspace_id

        members = await list_members(owner_auth, session)
        assert {member.email for member in members} == {"owner@nexus.dev", "guest@nexus.dev"}
        guest = next(member for member in members if member.email == "guest@nexus.dev")
        updated = await update_member_role(
            guest.user_id,
            WorkspaceRole.viewer,
            owner_auth,
            session,
        )
        assert updated.role == WorkspaceRole.viewer

        workspaces = await list_workspaces(guest_auth, session)
        assert len(workspaces) == 2
        switched = await issue_workspace_session(guest_auth, owner_auth.workspace_id, session)
        assert switched.token.workspace_id == owner_auth.workspace_id
        assert switched.token.role == WorkspaceRole.viewer.value

        usage = await get_usage(owner_auth, session)
        assert usage.members == 2
        assert usage.member_limit == 5

    await engine.dispose()
