from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.models.enums import WorkspaceRole
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.services.firebase_auth import FirebaseIdentity


async def register_user(request: RegisterRequest, session: AsyncSession) -> TokenResponse:
    email = request.email.strip().lower()
    existing = await session.scalar(select(User).where(func.lower(User.email) == email))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email is already registered")

    user = User(
        email=email,
        full_name=request.full_name.strip(),
        password_hash=hash_password(request.password),
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
    await session.commit()
    await session.refresh(user)
    await session.refresh(workspace)
    return _token_response(user, workspace.id)


async def login_user(request: LoginRequest, session: AsyncSession) -> TokenResponse:
    email = request.email.strip().lower()
    user = await session.scalar(select(User).where(func.lower(User.email) == email))
    if not user or not user.password_hash or not verify_password(request.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")

    workspace_id = await session.scalar(
        select(WorkspaceMember.workspace_id)
        .where(WorkspaceMember.user_id == user.id)
        .order_by(WorkspaceMember.created_at)
    )
    if not workspace_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No workspace membership found")
    return _token_response(user, workspace_id)


async def exchange_firebase_identity(
    identity: FirebaseIdentity, session: AsyncSession
) -> TokenResponse:
    user = await session.scalar(select(User).where(User.firebase_uid == identity.uid))
    if user is None:
        user = await session.scalar(
            select(User).where(func.lower(User.email) == identity.email)
        )
        if user is not None and user.firebase_uid not in {None, identity.uid}:
            raise HTTPException(status.HTTP_409_CONFLICT, "Account identity conflict")

    if user is None:
        user = User(
            email=identity.email,
            full_name=identity.full_name,
            avatar_url=identity.avatar_url,
            firebase_uid=identity.uid,
        )
        workspace = Workspace(
            name=f"{identity.full_name}'s Nexus",
            slug=f"{_slug(identity.full_name)}-{uuid4().hex[:8]}",
        )
        session.add_all(
            [
                user,
                workspace,
                WorkspaceMember(
                    workspace=workspace,
                    user=user,
                    role=WorkspaceRole.owner,
                ),
            ]
        )
        await session.commit()
        await session.refresh(user)
        await session.refresh(workspace)
        return _token_response(user, workspace.id)

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")
    if user.firebase_uid is None:
        user.firebase_uid = identity.uid
    user.avatar_url = identity.avatar_url or user.avatar_url
    workspace_id = await session.scalar(
        select(WorkspaceMember.workspace_id)
        .where(WorkspaceMember.user_id == user.id)
        .order_by(WorkspaceMember.created_at)
    )
    if not workspace_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No workspace membership found")
    await session.commit()
    return _token_response(user, workspace_id)


def _token_response(user: User, workspace_id: str) -> TokenResponse:
    token = create_access_token(
        user.id,
        {"workspace_id": workspace_id, "email": user.email},
    )
    return TokenResponse(access_token=token, user_id=user.id, workspace_id=workspace_id)


def _slug(value: str) -> str:
    normalized = "".join(character.lower() if character.isalnum() else "-" for character in value)
    return "-".join(part for part in normalized.split("-") if part)[:80] or "workspace"
