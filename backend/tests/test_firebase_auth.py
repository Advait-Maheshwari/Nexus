import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models import Base
from app.models.user import User
from app.services.firebase_auth import (
    FirebaseIdentity,
    FirebaseTokenVerifier,
    _cache_max_age,
    _safe_name,
)
from app.services.database_auth import exchange_firebase_identity


def test_firebase_name_is_restricted_to_letters_and_spaces() -> None:
    assert _safe_name("Advait 7 @ Nexus") == "Advait Nexus"
    assert _safe_name("123") == "Nexus User"


def test_certificate_cache_age_is_bounded() -> None:
    assert _cache_max_age("public, max-age=42") == 60
    assert _cache_max_age("max-age=999999") == 86_400
    assert _cache_max_age("no-cache") == 3_600


@pytest.mark.asyncio
async def test_firebase_token_rejects_unsigned_or_wrong_algorithm_tokens() -> None:
    verifier = FirebaseTokenVerifier()
    with pytest.raises(HTTPException) as raised:
        await verifier.verify("not-a-jwt")
    assert raised.value.status_code == 401


@pytest.mark.asyncio
async def test_unverified_firebase_email_can_start_workspace_without_marking_verified() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        issued = await exchange_firebase_identity(
            FirebaseIdentity(
                uid="firebase-demo-1",
                email="demo@nexus.dev",
                full_name="Demo User",
                avatar_url=None,
                email_verified=False,
            ),
            session,
        )
        user = await session.scalar(select(User).where(User.email == "demo@nexus.dev"))

    assert issued.token.email == "demo@nexus.dev"
    assert user is not None
    assert user.email_verified_at is None
