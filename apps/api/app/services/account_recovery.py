from __future__ import annotations

from datetime import UTC, datetime, timedelta
from hashlib import sha256
from secrets import token_urlsafe

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.models.account_action_token import AccountActionToken
from app.models.user import User
from app.models.user_session import UserSession
from app.services.email_delivery import AccountEmail, deliver_account_email

EMAIL_VERIFICATION = "email_verification"
PASSWORD_RESET = "password_reset"


async def begin_email_verification(user: User, session: AsyncSession) -> None:
    if user.email_verified_at is not None:
        return
    raw_token = await _issue_token(
        user.id,
        EMAIL_VERIFICATION,
        timedelta(hours=settings.email_verification_expire_hours),
        session,
    )
    await session.commit()
    url = _action_url("verify_email", raw_token)
    await deliver_account_email(
        AccountEmail(
            recipient=user.email,
            subject="Verify your Nexus account",
            body=(
                f"Hello {user.full_name},\n\n"
                f"Verify your Nexus account within "
                f"{settings.email_verification_expire_hours} hours:\n{url}\n\n"
                "If you did not create this account, ignore this message."
            ),
        )
    )


async def resend_email_verification(email: str, session: AsyncSession) -> None:
    user = await session.scalar(select(User).where(func.lower(User.email) == email.lower()))
    if user is None or user.email_verified_at is not None or not user.password_hash:
        return
    await begin_email_verification(user, session)


async def verify_email(raw_token: str, session: AsyncSession) -> None:
    token, user = await _resolve_token(raw_token, EMAIL_VERIFICATION, session)
    now = datetime.now(UTC)
    token.consumed_at = now
    user.email_verified_at = now
    await _consume_sibling_tokens(user.id, EMAIL_VERIFICATION, now, session, token.id)
    await session.commit()


async def begin_password_reset(email: str, session: AsyncSession) -> None:
    user = await session.scalar(select(User).where(func.lower(User.email) == email.lower()))
    if user is None or not user.password_hash or not user.is_active:
        return
    raw_token = await _issue_token(
        user.id,
        PASSWORD_RESET,
        timedelta(minutes=settings.password_reset_expire_minutes),
        session,
    )
    await session.commit()
    url = _action_url("reset_password", raw_token)
    await deliver_account_email(
        AccountEmail(
            recipient=user.email,
            subject="Reset your Nexus password",
            body=(
                f"Hello {user.full_name},\n\n"
                f"Reset your Nexus password within "
                f"{settings.password_reset_expire_minutes} minutes:\n{url}\n\n"
                "If you did not request this reset, ignore this message."
            ),
        )
    )


async def reset_password(raw_token: str, new_password: str, session: AsyncSession) -> None:
    token, user = await _resolve_token(raw_token, PASSWORD_RESET, session)
    if user.password_hash and verify_password(new_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choose a different password")

    now = datetime.now(UTC)
    token.consumed_at = now
    user.password_hash = hash_password(new_password)
    user.email_verified_at = user.email_verified_at or now
    await session.execute(
        update(UserSession)
        .where(UserSession.user_id == user.id, UserSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    await _consume_sibling_tokens(user.id, PASSWORD_RESET, now, session, token.id)
    await session.commit()


async def _issue_token(
    user_id: str,
    purpose: str,
    lifetime: timedelta,
    session: AsyncSession,
) -> str:
    now = datetime.now(UTC)
    await session.execute(
        update(AccountActionToken)
        .where(
            AccountActionToken.user_id == user_id,
            AccountActionToken.purpose == purpose,
            AccountActionToken.consumed_at.is_(None),
        )
        .values(consumed_at=now)
    )
    raw_token = token_urlsafe(48)
    session.add(
        AccountActionToken(
            user_id=user_id,
            purpose=purpose,
            token_hash=_hash_token(raw_token),
            expires_at=now + lifetime,
        )
    )
    await session.flush()
    return raw_token


async def _resolve_token(
    raw_token: str,
    purpose: str,
    session: AsyncSession,
) -> tuple[AccountActionToken, User]:
    now = datetime.now(UTC)
    token = await session.scalar(
        select(AccountActionToken)
        .where(
            AccountActionToken.token_hash == _hash_token(raw_token),
            AccountActionToken.purpose == purpose,
        )
        .with_for_update()
    )
    if token is None or token.consumed_at is not None or _as_utc(token.expires_at) <= now:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Action link is invalid or expired")
    user = await session.get(User, token.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Action link is invalid or expired")
    return token, user


async def _consume_sibling_tokens(
    user_id: str,
    purpose: str,
    consumed_at: datetime,
    session: AsyncSession,
    current_token_id: str,
) -> None:
    await session.execute(
        update(AccountActionToken)
        .where(
            AccountActionToken.user_id == user_id,
            AccountActionToken.purpose == purpose,
            AccountActionToken.id != current_token_id,
            AccountActionToken.consumed_at.is_(None),
        )
        .values(consumed_at=consumed_at)
    )


def _action_url(parameter: str, raw_token: str) -> str:
    return f"{str(settings.web_url).rstrip('/')}?{parameter}={raw_token}"


def _hash_token(raw_token: str) -> str:
    return sha256(raw_token.encode("utf-8")).hexdigest()


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
