from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx
from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.core.config import settings

FIREBASE_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)


@dataclass(frozen=True)
class FirebaseIdentity:
    uid: str
    email: str
    full_name: str
    avatar_url: str | None


class FirebaseTokenVerifier:
    def __init__(self) -> None:
        self._certificates: dict[str, str] = {}
        self._expires_at = datetime.min.replace(tzinfo=UTC)
        self._lock = asyncio.Lock()

    async def verify(self, id_token: str) -> FirebaseIdentity:
        try:
            header = jwt.get_unverified_header(id_token)
        except JWTError as error:
            raise _invalid_token() from error
        if header.get("alg") != "RS256" or not header.get("kid"):
            raise _invalid_token()

        certificates = await self._get_certificates()
        certificate = certificates.get(str(header["kid"]))
        if certificate is None:
            await self._refresh_certificates()
            certificate = self._certificates.get(str(header["kid"]))
        if certificate is None:
            raise _invalid_token()

        try:
            payload = jwt.decode(
                id_token,
                certificate,
                algorithms=["RS256"],
                audience=settings.firebase_project_id,
                issuer=f"https://securetoken.google.com/{settings.firebase_project_id}",
                options={"verify_at_hash": False},
            )
        except JWTError as error:
            raise _invalid_token() from error

        uid = str(payload.get("sub", "")).strip()
        email = str(payload.get("email", "")).strip().lower()
        if not uid or not email or payload.get("email_verified") is not True:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                "A verified Firebase email is required",
            )
        return FirebaseIdentity(
            uid=uid,
            email=email,
            full_name=_safe_name(str(payload.get("name", ""))),
            avatar_url=str(payload["picture"])[:500] if payload.get("picture") else None,
        )

    async def _get_certificates(self) -> dict[str, str]:
        if self._certificates and datetime.now(UTC) < self._expires_at:
            return self._certificates
        await self._refresh_certificates()
        return self._certificates

    async def _refresh_certificates(self) -> None:
        async with self._lock:
            if self._certificates and datetime.now(UTC) < self._expires_at:
                return
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    response = await client.get(FIREBASE_CERTS_URL)
                    response.raise_for_status()
            except httpx.HTTPError as error:
                raise HTTPException(
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    "Identity verification is temporarily unavailable",
                ) from error
            self._certificates = {
                str(key): str(value) for key, value in response.json().items()
            }
            self._expires_at = datetime.now(UTC) + timedelta(
                seconds=_cache_max_age(response.headers.get("cache-control", ""))
            )


def _safe_name(value: str) -> str:
    normalized = " ".join(
        "".join(character if character.isalpha() or character.isspace() else " " for character in value)
        .split()
    )
    return normalized[:160] or "Nexus User"


def _cache_max_age(cache_control: str) -> int:
    for directive in cache_control.split(","):
        key, separator, value = directive.strip().partition("=")
        if separator and key.lower() == "max-age" and value.isdigit():
            return max(60, min(int(value), 86_400))
    return 3_600


def _invalid_token() -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Invalid or expired Firebase session",
        headers={"WWW-Authenticate": "Bearer"},
    )


firebase_token_verifier = FirebaseTokenVerifier()
