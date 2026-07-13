import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.models.enums import WorkspaceRole
from app.models.user_session import UserSession
from app.models.workspace import WorkspaceMember

password_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthContext:
    user_id: str
    workspace_id: str
    role: WorkspaceRole = WorkspaceRole.owner
    session_id: str | None = None


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return password_context.verify(plain_password, password_hash)


def create_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(subject: str, extra_claims: dict[str, Any] | None = None) -> str:
    issued_at = datetime.now(UTC)
    expires_at = issued_at + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expires_at,
        "iat": issued_at,
        "jti": str(uuid4()),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


async def require_auth_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> AuthContext:
    if settings.auth_backend != "database":
        return AuthContext(user_id="local-user", workspace_id="workspace-personal")
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("Authentication required")

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
        )
        user_id = str(payload["sub"])
        workspace_id = str(payload["workspace_id"])
        session_id = str(payload["sid"])
        if payload.get("type") != "access":
            raise JWTError("Unexpected token type")
    except (JWTError, KeyError, TypeError, ValueError) as error:
        raise _unauthorized("Invalid or expired session") from error

    active_session = await session.scalar(
        select(UserSession.id).where(
            UserSession.id == session_id,
            UserSession.user_id == user_id,
            UserSession.workspace_id == workspace_id,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > datetime.now(UTC),
        )
    )
    if active_session is None:
        raise _unauthorized("Session has been revoked")

    role = await session.scalar(
        select(WorkspaceMember.role).where(
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.workspace_id == workspace_id,
        )
    )
    if role is None:
        raise _unauthorized("Workspace access denied")
    return AuthContext(
        user_id=user_id,
        workspace_id=workspace_id,
        role=WorkspaceRole(role),
        session_id=session_id,
    )


WORKSPACE_EDITOR_ROLES = {
    WorkspaceRole.owner,
    WorkspaceRole.admin,
    WorkspaceRole.member,
}


def require_workspace_editor(auth: AuthContext) -> None:
    if auth.role not in WORKSPACE_EDITOR_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace viewer role cannot modify project data",
        )


def require_workspace_admin(auth: AuthContext) -> None:
    if auth.role not in {WorkspaceRole.owner, WorkspaceRole.admin}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace administrator role is required",
        )


def require_workspace_owner(auth: AuthContext) -> None:
    if auth.role != WorkspaceRole.owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace owner role is required",
        )


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )
