import pytest
from jose import JWTError, jwt
from pydantic import ValidationError

from app.core.config import Settings, settings
from app.core.security import create_access_token
from app.schemas.auth import RegisterRequest


def test_registration_rejects_numbers_in_full_name() -> None:
    with pytest.raises(ValidationError, match="letters and spaces only"):
        RegisterRequest(
            email="pilot@nexus.dev",
            full_name="Pilot 7",
            password="secure-password-7",
        )


def test_registration_normalizes_valid_identity() -> None:
    request = RegisterRequest(
        email="  PILOT@NEXUS.DEV ",
        full_name="  Nexus   Pilot  ",
        password="secure-password-7",
    )
    assert request.email == "pilot@nexus.dev"
    assert request.full_name == "Nexus Pilot"


def test_registration_rejects_password_without_number() -> None:
    with pytest.raises(ValidationError, match="one letter and one number"):
        RegisterRequest(
            email="pilot@nexus.dev",
            full_name="Nexus Pilot",
            password="letters-only-password",
        )


def test_access_token_is_bound_to_nexus_audience_and_issuer() -> None:
    token = create_access_token("user-1", {"workspace_id": "workspace-1"})
    payload = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        audience=settings.jwt_audience,
        issuer=settings.jwt_issuer,
    )
    assert payload["type"] == "access"
    assert payload["workspace_id"] == "workspace-1"

    with pytest.raises(JWTError):
        jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            audience="another-app",
            issuer=settings.jwt_issuer,
        )


def test_production_rejects_default_or_short_jwt_secret() -> None:
    with pytest.raises(ValidationError, match="at least 32 characters"):
        Settings(NEXUS_ENV="production", JWT_SECRET_KEY="too-short")


def test_neon_database_url_is_normalized_for_asyncpg() -> None:
    settings = Settings(
        database_url=(
            "postgresql://nexus:secret@example.neon.tech/nexus"
            "?sslmode=require&channel_binding=require"
        )
    )

    assert settings.database_url == "postgresql+asyncpg://nexus:secret@example.neon.tech/nexus?ssl=require"
