from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models import Base
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services import account_recovery
from app.services.account_recovery import begin_password_reset, reset_password, verify_email
from app.services.database_auth import (
    VerificationIssue,
    login_user,
    register_user,
    rotate_refresh_token,
)
from app.services.email_delivery import AccountEmail


@pytest.mark.asyncio
async def test_email_verification_is_single_use_and_gates_login(monkeypatch) -> None:
    messages: list[AccountEmail] = []

    async def capture(message: AccountEmail) -> bool:
        messages.append(message)
        return True

    monkeypatch.setattr(account_recovery, "deliver_account_email", capture)
    monkeypatch.setattr(settings, "require_email_verification", True)
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        registration = await register_user(
            RegisterRequest(
                email="verify@nexus.dev",
                full_name="Verify Pilot",
                password="secure-password-7",
            ),
            session,
        )
        assert isinstance(registration, VerificationIssue)
        user = await session.scalar(select(User).where(User.email == "verify@nexus.dev"))
        assert user is not None
        assert user.email_verified_at is None

        with pytest.raises(HTTPException) as blocked:
            await login_user(
                LoginRequest(email="verify@nexus.dev", password="secure-password-7"),
                session,
            )
        assert blocked.value.status_code == 403

    assert len(messages) == 1
    token = _token_from_message(messages[0], "verify_email")
    async with session_factory() as session:
        await verify_email(token, session)
        issued = await login_user(
            LoginRequest(email="verify@nexus.dev", password="secure-password-7"),
            session,
        )
        assert issued.token.email == "verify@nexus.dev"

    async with session_factory() as session:
        with pytest.raises(HTTPException) as replay:
            await verify_email(token, session)
        assert replay.value.status_code == 400

    await engine.dispose()


@pytest.mark.asyncio
async def test_password_reset_revokes_sessions_and_rejects_replay(monkeypatch) -> None:
    messages: list[AccountEmail] = []

    async def capture(message: AccountEmail) -> bool:
        messages.append(message)
        return True

    monkeypatch.setattr(account_recovery, "deliver_account_email", capture)
    monkeypatch.setattr(settings, "require_email_verification", False)
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        issued = await register_user(
            RegisterRequest(
                email="reset@nexus.dev",
                full_name="Reset Pilot",
                password="secure-password-7",
            ),
            session,
        )
        assert not isinstance(issued, VerificationIssue)
        original_refresh = issued.refresh_token
        await begin_password_reset("reset@nexus.dev", session)

    assert len(messages) == 1
    token = _token_from_message(messages[0], "reset_password")
    async with session_factory() as session:
        await reset_password(token, "new-secure-password-8", session)

    async with session_factory() as session:
        with pytest.raises(HTTPException) as revoked:
            await rotate_refresh_token(original_refresh, session)
        assert revoked.value.status_code == 401
        with pytest.raises(HTTPException) as old_password:
            await login_user(
                LoginRequest(email="reset@nexus.dev", password="secure-password-7"),
                session,
            )
        assert old_password.value.status_code == 401
        relogin = await login_user(
            LoginRequest(email="reset@nexus.dev", password="new-secure-password-8"),
            session,
        )
        assert relogin.token.email == "reset@nexus.dev"
        with pytest.raises(HTTPException) as replay:
            await reset_password(token, "another-password-9", session)
        assert replay.value.status_code == 400

    await engine.dispose()


def _token_from_message(message: AccountEmail, parameter: str) -> str:
    link = next(line for line in message.body.splitlines() if parameter in line)
    return parse_qs(urlsplit(link).query)[parameter][0]
