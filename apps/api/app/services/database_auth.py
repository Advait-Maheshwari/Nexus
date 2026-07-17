from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import delete, func, or_, select, update
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
from app.models.account_action_token import AccountActionToken
from app.models.activity_log import ActivityLog
from app.models.ai_insight import AIInsight
from app.models.enums import Priority, WorkStatus, WorkspaceRole
from app.models.feature import Feature
from app.models.idea import Idea
from app.models.journal import JournalEntry
from app.models.milestone import Milestone
from app.models.project import Project
from app.models.task import Task, TaskDependency
from app.models.time_entry import TimeEntry
from app.models.user import User
from app.models.user_session import UserSession
from app.models.workspace import Workspace, WorkspaceInvitation, WorkspaceMember
from app.schemas.auth import (
    AccountDeleteRequest,
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
        demo_access=_has_demo_access(user.email),
        demo_workspace=workspace.slug == _demo_slug(user.id),
    )


async def enter_private_demo(auth: AuthContext, session: AsyncSession) -> SessionIssue:
    user = await session.get(User, auth.user_id)
    if user is None or not user.is_active or not _has_demo_access(user.email):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Private demo is not available")

    slug = _demo_slug(user.id)
    workspace = await session.scalar(select(Workspace).where(Workspace.slug == slug))
    if workspace is None:
        workspace = Workspace(
            name="Nexus Private Demo",
            slug=slug,
            plan_code="personal_free",
        )
        session.add_all(
            [
                workspace,
                WorkspaceMember(workspace=workspace, user=user, role=WorkspaceRole.owner),
            ]
        )
        await session.flush()
        await _seed_private_demo(session, user, workspace)
    else:
        membership = await session.scalar(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace.id,
                WorkspaceMember.user_id == user.id,
                WorkspaceMember.role == WorkspaceRole.owner,
            )
        )
        if membership is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Private demo is not available")

    issued = await _issue_session(user, workspace.id, WorkspaceRole.owner, session)
    await _replace_current_session(auth, issued, session)
    await session.commit()
    return issued


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


async def delete_account(
    request: AccountDeleteRequest, auth: AuthContext, session: AsyncSession
) -> None:
    user = await session.scalar(select(User).where(User.id == auth.user_id).with_for_update())
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account was not found")
    if user.password_hash and (
        not request.current_password
        or not verify_password(request.current_password, user.password_hash)
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Current password is incorrect")

    owned_workspace_ids = list(
        (
            await session.scalars(
                select(WorkspaceMember.workspace_id).where(
                    WorkspaceMember.user_id == user.id,
                    WorkspaceMember.role == WorkspaceRole.owner,
                )
            )
        ).all()
    )
    if owned_workspace_ids:
        shared_workspace = await session.scalar(
            select(Workspace.id)
            .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
            .where(Workspace.id.in_(owned_workspace_ids))
            .group_by(Workspace.id)
            .having(func.count(WorkspaceMember.id) > 1)
            .limit(1)
        )
        if shared_workspace:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Transfer or remove the other members from owned workspaces before deleting your account",
            )

    project_conditions = [Project.owner_id == user.id]
    if owned_workspace_ids:
        project_conditions.append(Project.workspace_id.in_(owned_workspace_ids))
    project_ids = list(
        (await session.scalars(select(Project.id).where(or_(*project_conditions)))).all()
    )
    await _delete_project_graph(session, project_ids)

    await session.execute(delete(TimeEntry).where(TimeEntry.user_id == user.id))
    await session.execute(
        update(ActivityLog).where(ActivityLog.actor_id == user.id).values(actor_id=None)
    )
    invitation_conditions = [WorkspaceInvitation.invited_by_id == user.id]
    if owned_workspace_ids:
        invitation_conditions.append(WorkspaceInvitation.workspace_id.in_(owned_workspace_ids))
    await session.execute(delete(WorkspaceInvitation).where(or_(*invitation_conditions)))
    await session.execute(delete(AccountActionToken).where(AccountActionToken.user_id == user.id))
    await session.execute(delete(UserSession).where(UserSession.user_id == user.id))
    await session.execute(delete(WorkspaceMember).where(WorkspaceMember.user_id == user.id))
    if owned_workspace_ids:
        await session.execute(delete(Workspace).where(Workspace.id.in_(owned_workspace_ids)))
    await session.execute(delete(User).where(User.id == user.id))
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


async def _replace_current_session(
    auth: AuthContext, issued: SessionIssue, session: AsyncSession
) -> None:
    if not auth.session_id:
        return
    current = await session.get(UserSession, auth.session_id)
    if current is None or current.revoked_at is not None:
        return
    current.revoked_at = datetime.now(UTC)
    current.replaced_by_id = await session.scalar(
        select(UserSession.id).where(
            UserSession.refresh_token_hash == hash_refresh_token(issued.refresh_token)
        )
    )


async def _delete_project_graph(session: AsyncSession, project_ids: list[str]) -> None:
    if not project_ids:
        return
    task_ids = select(Task.id).where(Task.project_id.in_(project_ids))
    await session.execute(
        delete(TaskDependency).where(
            or_(
                TaskDependency.task_id.in_(task_ids),
                TaskDependency.depends_on_task_id.in_(task_ids),
            )
        )
    )
    await session.execute(delete(TimeEntry).where(TimeEntry.project_id.in_(project_ids)))
    await session.execute(delete(Idea).where(Idea.project_id.in_(project_ids)))
    await session.execute(delete(ActivityLog).where(ActivityLog.project_id.in_(project_ids)))
    await session.execute(delete(AIInsight).where(AIInsight.project_id.in_(project_ids)))
    await session.execute(delete(Milestone).where(Milestone.project_id.in_(project_ids)))
    await session.execute(delete(JournalEntry).where(JournalEntry.project_id.in_(project_ids)))
    await session.execute(delete(Task).where(Task.project_id.in_(project_ids)))
    await session.execute(delete(Feature).where(Feature.project_id.in_(project_ids)))
    await session.execute(delete(Project).where(Project.id.in_(project_ids)))


async def _seed_private_demo(
    session: AsyncSession, user: User, workspace: Workspace
) -> None:
    project = Project(
        workspace_id=workspace.id,
        owner_id=user.id,
        name="Nexus Product Launch",
        codename="NEXUS",
        description=(
            "Build a secure, zero-cost, AI-assisted project command system with clear goals, "
            "team ownership, live analytics, and meaningful 3D project views."
        ),
        status=WorkStatus.in_progress,
        priority=Priority.critical,
        health_score=86,
        target_velocity=8,
    )
    session.add(project)
    await session.flush()
    feature = Feature(
        workspace_id=workspace.id,
        project_id=project.id,
        title="Production launch baseline",
        description="Security, account lifecycle, deployment, responsive UX, and observability.",
        status=WorkStatus.in_progress,
        priority=Priority.critical,
        progress=70,
        sort_order=0,
    )
    session.add(feature)
    await session.flush()
    session.add_all(
        [
            Task(
                workspace_id=workspace.id,
                project_id=project.id,
                feature_id=feature.id,
                title="Verify the production account lifecycle",
                status=WorkStatus.in_progress,
                priority=Priority.critical,
                estimate_minutes=120,
                time_spent_minutes=45,
            ),
            Task(
                workspace_id=workspace.id,
                project_id=project.id,
                feature_id=feature.id,
                title="Complete cross-device release QA",
                status=WorkStatus.ready,
                priority=Priority.high,
                estimate_minutes=180,
                time_spent_minutes=0,
            ),
            Milestone(
                workspace_id=workspace.id,
                project_id=project.id,
                title="Production-ready Phase 5",
                description="Core workflows, security controls, and deployment are verified.",
                status=WorkStatus.in_progress,
            ),
        ]
    )


def _has_demo_access(email: str) -> bool:
    return email.strip().lower() in settings.demo_owner_email_set


def _demo_slug(user_id: str) -> str:
    return f"nexus-private-demo-{user_id.lower()}"[:120]


def _slug(value: str) -> str:
    normalized = "".join(character.lower() if character.isalnum() else "-" for character in value)
    return "-".join(part for part in normalized.split("-") if part)[:80] or "workspace"


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
