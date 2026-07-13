import pytest
from fastapi import HTTPException
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import AuthContext, hash_refresh_token
from app.models import Base
from app.models.user_session import UserSession
from app.schemas.auth import (
    AccountUpdateRequest,
    LoginRequest,
    PasswordChangeRequest,
    RegisterRequest,
)
from app.services.database_auth import (
    change_password,
    login_user,
    register_user,
    rotate_refresh_token,
    update_account,
)


@pytest.mark.asyncio
async def test_refresh_tokens_rotate_once_and_are_stored_as_hashes() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        issued = await register_user(
            RegisterRequest(
                email="pilot@nexus.dev",
                full_name="Nexus Pilot",
                password="secure-password-7",
            ),
            session,
        )
        stored = await session.scalar(
            select(UserSession).where(
                UserSession.refresh_token_hash == hash_refresh_token(issued.refresh_token)
            )
        )
        assert stored is not None
        assert stored.refresh_token_hash != issued.refresh_token

    async with session_factory() as session:
        rotated = await rotate_refresh_token(issued.refresh_token, session)
        assert rotated.refresh_token != issued.refresh_token

    async with session_factory() as session:
        with pytest.raises(HTTPException) as replay:
            await rotate_refresh_token(issued.refresh_token, session)
        assert replay.value.status_code == 401

    await engine.dispose()


@pytest.mark.asyncio
async def test_profile_update_and_password_change_revoke_other_devices() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        first = await register_user(
            RegisterRequest(
                email="owner@nexus.dev",
                full_name="Nexus Owner",
                password="secure-password-7",
            ),
            session,
        )
        second = await login_user(
            LoginRequest(email="owner@nexus.dev", password="secure-password-7"),
            session,
        )
        claims = jwt.decode(
            first.token.access_token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
        )
        auth = AuthContext(
            user_id=first.token.user_id,
            workspace_id=first.token.workspace_id,
            session_id=claims["sid"],
        )
        account = await update_account(AccountUpdateRequest(full_name="Updated Owner"), auth, session)
        assert account.full_name == "Updated Owner"

        await change_password(
            PasswordChangeRequest(
                current_password="secure-password-7",
                new_password="new-secure-password-8",
            ),
            auth,
            session,
        )

    async with session_factory() as session:
        with pytest.raises(HTTPException) as revoked:
            await rotate_refresh_token(second.refresh_token, session)
        assert revoked.value.status_code == 401
        relogin = await login_user(
            LoginRequest(email="owner@nexus.dev", password="new-secure-password-8"),
            session,
        )
        assert relogin.token.full_name == "Updated Owner"

    await engine.dispose()
