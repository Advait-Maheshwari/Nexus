import pytest
from fastapi import HTTPException

from app.services.firebase_auth import (
    FirebaseTokenVerifier,
    _cache_max_age,
    _safe_name,
)


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
