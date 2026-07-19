import pytest
from hashlib import sha256
from fastapi import HTTPException
from jose import jwt
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import AuthContext
from app.models import Base
from app.models.project import Project
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.auth import AccountDeleteRequest, RegisterRequest
from app.services.database_auth import (
    delete_account,
    enter_private_demo,
    get_account,
    register_user,
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
        session_id=claims["sid"],
    )


@pytest.mark.asyncio
async def test_private_demo_is_owner_only_and_idempotent(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        settings,
        "demo_owner_email_hashes",
        sha256(b"owner@nexus.dev").hexdigest(),
    )
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        owner = await register_user(
            RegisterRequest(
                email="owner@nexus.dev",
                full_name="Nexus Owner",
                password="secure-password-7",
            ),
            session,
        )
        owner_auth = _auth(owner.token.access_token)
        account = await get_account(owner_auth, session)
        assert account.demo_access is True
        assert account.demo_workspace is False

        demo = await enter_private_demo(owner_auth, session)
        demo_auth = _auth(demo.token.access_token)
        demo_account = await get_account(demo_auth, session)
        assert demo_account.demo_workspace is True
        assert demo.token.workspace_id != owner.token.workspace_id
        assert await session.scalar(
            select(func.count(Project.id)).where(Project.workspace_id == demo.token.workspace_id)
        ) == 1

        await enter_private_demo(demo_auth, session)
        assert await session.scalar(
            select(func.count(Project.id)).where(Project.workspace_id == demo.token.workspace_id)
        ) == 1

        outsider = await register_user(
            RegisterRequest(
                email="member@nexus.dev",
                full_name="Nexus Member",
                password="secure-password-8",
            ),
            session,
        )
        outsider_account = await get_account(_auth(outsider.token.access_token), session)
        assert outsider_account.demo_access is False
        with pytest.raises(HTTPException) as denied:
            await enter_private_demo(_auth(outsider.token.access_token), session)
        assert denied.value.status_code == 404

    await engine.dispose()


@pytest.mark.asyncio
async def test_account_deletion_removes_private_workspaces_and_sessions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "demo_owner_email_hashes",
        sha256(b"owner@nexus.dev").hexdigest(),
    )
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        owner = await register_user(
            RegisterRequest(
                email="owner@nexus.dev",
                full_name="Nexus Owner",
                password="secure-password-7",
            ),
            session,
        )
        demo = await enter_private_demo(_auth(owner.token.access_token), session)
        await delete_account(
            AccountDeleteRequest(
                confirmation="DELETE MY ACCOUNT",
                current_password="secure-password-7",
            ),
            _auth(demo.token.access_token),
            session,
        )
        assert await session.scalar(select(func.count(User.id))) == 0
        assert await session.scalar(select(func.count(Workspace.id))) == 0
        assert await session.scalar(select(func.count(Project.id))) == 0

    await engine.dispose()


@pytest.mark.asyncio
async def test_account_deletion_blocks_an_owner_of_a_shared_workspace() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        owner = await register_user(
            RegisterRequest(
                email="owner@nexus.dev",
                full_name="Nexus Owner",
                password="secure-password-7",
            ),
            session,
        )
        member = await register_user(
            RegisterRequest(
                email="member@nexus.dev",
                full_name="Nexus Member",
                password="secure-password-8",
            ),
            session,
        )
        session.add(
            WorkspaceMember(
                workspace_id=owner.token.workspace_id,
                user_id=member.token.user_id,
                role="member",
            )
        )
        await session.commit()

        with pytest.raises(HTTPException) as blocked:
            await delete_account(
                AccountDeleteRequest(
                    confirmation="DELETE MY ACCOUNT",
                    current_password="secure-password-7",
                ),
                _auth(owner.token.access_token),
                session,
            )
        assert blocked.value.status_code == 409
        assert await session.scalar(select(func.count(User.id))) == 2

    await engine.dispose()
