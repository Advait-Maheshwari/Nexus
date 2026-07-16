from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    AuthContext,
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.enums import WorkspaceRole
from app.models.user import User
from app.models.user_session import UserSession
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.auth import (
    AccountResponse,
    AccountUpdateRequest,
    LoginRequest,
    PasswordChangeRequest,
    RegisterRequest,
    TokenResponse,
)
from app.services.account_recovery import begin_email_verification
from app.services.firebase_auth import FirebaseIdentity


@dataclass(frozen=True)
class SessionIssue:
    token: TokenResponse
    refresh_token: str


@dataclass(frozen=True)
class VerificationIssue:
    message: str = "Check your email to verify your Nexus account."
    verification_required: bool = True


async def register_user(
    request: RegisterRequest, session: AsyncSession
) -> SessionIssue | VerificationIssue:
    email = request.email.strip().lower()
    existing = await session.scalar(select(User).where(func.lower(User.email) == email))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email is already registered")

    user = User(
        email=email,
        full_name=request.full_name.strip(),
        password_hash=hash_password(request.password),
        email_verified_at=None if settings.require_email_verification else datetime.now(UTC),
    )
    workspace = Workspace(
        name=f"{request.full_name.strip()}'s Nexus",
        slug=f"{_slug(request.full_name)}-{uuid4().hex[:8]}",
    )
    membership = WorkspaceMember(
        workspace=workspace,
        user=user,
        role=WorkspaceRole.owner,
    )
    session.add_all([user, workspace, membership])
    await session.flush()
    if settings.require_email_verification:
        await begin_email_verification(user, session)
        return VerificationIssue()
    issued = await _issue_session(user, workspace.id, WorkspaceRole.owner, session)
    await session.commit()
    return issued


async def login_user(request: LoginRequest, session: AsyncSession) -> SessionIssue:
    email = request.email.strip().lower()
    user = await session.scalar(select(User).where(func.lower(User.email) == email))
    if (
        not user
        or not user.password_hash
        or not verify_password(request.password, user.password_hash)
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")
    if settings.require_email_verification and user.email_verified_at is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Email verification required")

    membership = await session.scalar(
        select(WorkspaceMember)
        .where(WorkspaceMember.user_id == user.id)
        .order_by(WorkspaceMember.created_at)
    )
    if not membership:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No workspace membership found")
    issued = await _issue_session(
        user, membership.workspace_id, WorkspaceRole(membership.role), session
    )
    await session.commit()
    return issued


async def exchange_firebase_identity(
    identity: FirebaseIdentity, session: AsyncSession
) -> SessionIssue:
    user = await session.scalar(select(User).where(User.firebase_uid == identity.uid))
    if user is None:
        user = await session.scalar(select(User).where(func.lower(User.email) == identity.email))
        if user is not None and user.firebase_uid not in {None, identity.uid}:
            raise HTTPException(status.HTTP_409_CONFLICT, "Account identity conflict")

    if user is None:
        user = User(
            email=identity.email,
            full_name=identity.full_name,
            avatar_url=identity.avatar_url,
            firebase_uid=identity.uid,
            email_verified_at=datetime.now(UTC),
        )
        workspace = Workspace(
            name=f"{identity.full_name}'s Nexus",
            slug=f"{_slug(identity.full_name)}-{uuid4().hex[:8]}",
        )
        membership = WorkspaceMember(
            workspace=workspace,
            user=user,
            role=WorkspaceRole.owner,
        )
        session.add_all([user, workspace, membership])
        await session.flush()
        issued = await _issue_session(user, workspace.id, WorkspaceRole.owner, session)
        await session.commit()
        return issued

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")
    if user.firebase_uid is None:
        user.firebase_uid = identity.uid
    user.email_verified_at = user.email_verified_at or datetime.now(UTC)
    user.avatar_url = identity.avatar_url or user.avatar_url
    membership = await session.scalar(
        select(WorkspaceMember)
        .where(WorkspaceMember.user_id == user.id)
        .order_by(WorkspaceMember.created_at)
    )
    if not membership:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No workspace membership found")
    issued = await _issue_session(
        user, membership.workspace_id, WorkspaceRole(membership.role), session
    )
    await session.commit()
    return issued


async def rotate_refresh_token(raw_token: str, session: AsyncSession) -> SessionIssue:
    now = datetime.now(UTC)
    stored = await session.scalar(
        select(UserSession)
        .where(UserSession.refresh_token_hash == hash_refresh_token(raw_token))
        .with_for_update()
    )
    if stored is None or stored.revoked_at is not None or _as_utc(stored.expires_at) <= now:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh session is invalid or expired")

    user = await session.get(User, stored.user_id)
    membership = await session.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.user_id == stored.user_id,
            WorkspaceMember.workspace_id == stored.workspace_id,
        )
    )
    if user is None or not user.is_active or membership is None:
        stored.revoked_at = now
        await session.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Workspace access is no longer active")

    stored.revoked_at = now
    issued = await _issue_session(
        user, stored.workspace_id, WorkspaceRole(membership.role), session
    )
    replacement = await session.scalar(
        select(UserSession).where(
            UserSession.refresh_token_hash == hash_refresh_token(issued.refresh_token)
        )
    )
    stored.replaced_by_id = replacement.id if replacement else None
    await session.commit()
    return issued


async def revoke_refresh_token(raw_token: str | None, session: AsyncSession) -> None:
    if not raw_token:
        return
    stored = await session.scalar(
        select(UserSession).where(UserSession.refresh_token_hash == hash_refresh_token(raw_token))
    )
    if stored is not None and stored.revoked_at is None:
        stored.revoked_at = datetime.now(UTC)
        await session.commit()


async def revoke_all_sessions(auth: AuthContext, session: AsyncSession) -> None:
    await session.execute(
        update(UserSession)
        .where(UserSession.user_id == auth.user_id, UserSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    await session.commit()


async def issue_workspace_session(
    auth: AuthContext, workspace_id: str, session: AsyncSession
) -> SessionIssue:
    user = await session.get(User, auth.user_id)
    membership = await session.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.user_id == auth.user_id,
            WorkspaceMember.workspace_id == workspace_id,
        )
    )
    if user is None or not user.is_active or membership is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Workspace access denied")
    issued = await _issue_session(user, workspace_id, WorkspaceRole(membership.role), session)
    if auth.session_id:
        current = await session.get(UserSession, auth.session_id)
        if current is not None and current.revoked_at is None:
            current.revoked_at = datetime.now(UTC)
            current.replaced_by_id = await session.scalar(
                select(UserSession.id).where(
                    UserSession.refresh_token_hash == hash_refresh_token(issued.refresh_token)
                )
            )
    await session.commit()
    return issued


async def get_account(auth: AuthContext, session: AsyncSession) -> AccountResponse:
    row = (
        await session.execute(
            select(User, Workspace, WorkspaceMember.role)
            .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
            .join(Workspace, Workspace.id == WorkspaceMember.workspace_id)
            .where(
                User.id == auth.user_id,
                Workspace.id == auth.workspace_id,
            )
        )
    ).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account was not found")
    user, workspace, role = row
    return AccountResponse(
        user_id=user.id,
        workspace_id=workspace.id,
        full_name=user.full_name,
        email=user.email,
        avatar_url=user.avatar_url,
        role=WorkspaceRole(role).value,
        workspace_name=workspace.name,
        password_enabled=user.password_hash is not None,
        email_verified=user.email_verified_at is not None,
    )


async def update_account(
    request: AccountUpdateRequest, auth: AuthContext, session: AsyncSession
) -> AccountResponse:
    user = await session.get(User, auth.user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account was not found")
    user.full_name = request.full_name
    if "avatar_url" in request.model_fields_set:
        user.avatar_url = request.avatar_url
    await session.commit()
    return await get_account(auth, session)


async def change_password(
    request: PasswordChangeRequest, auth: AuthContext, session: AsyncSession
) -> None:
    user = await session.get(User, auth.user_id)
    if user is None or not user.password_hash:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This account uses Google sign-in and does not have a Nexus password",
        )
    if not verify_password(request.current_password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Current password is incorrect")
    if verify_password(request.new_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choose a different password")

    user.password_hash = hash_password(request.new_password)
    await session.execute(
        update(UserSession)
        .where(
            UserSession.user_id == auth.user_id,
            UserSession.id != auth.session_id,
            UserSession.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(UTC))
    )
    await session.commit()


async def _issue_session(
    user: User,
    workspace_id: str,
    role: WorkspaceRole,
    session: AsyncSession,
) -> SessionIssue:
    raw_refresh_token = create_refresh_token()
    stored = UserSession(
        user_id=user.id,
        workspace_id=workspace_id,
        refresh_token_hash=hash_refresh_token(raw_refresh_token),
        expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
    )
    session.add(stored)
    await session.flush()
    token = create_access_token(
        user.id,
        {
            "workspace_id": workspace_id,
            "email": user.email,
            "role": role.value,
            "sid": stored.id,
        },
    )
    return SessionIssue(
        token=TokenResponse(
            access_token=token,
            user_id=user.id,
            workspace_id=workspace_id,
            full_name=user.full_name,
            email=user.email,
            role=role.value,
        ),
        refresh_token=raw_refresh_token,
    )


def _slug(value: str) -> str:
    normalized = "".join(character.lower() if character.isalnum() else "-" for character in value)
    return "-".join(part for part in normalized.split("-") if part)[:80] or "workspace"


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
