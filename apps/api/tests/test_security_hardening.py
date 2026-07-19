import ssl

import httpx
import pytest
from pydantic import ValidationError

from app.core.config import Settings, settings
from app.core.request_limits import RequestSizeLimitMiddleware
from app.main import create_app
from app.services.email_delivery import AccountEmail, _send_smtp


def test_production_requires_database_auth() -> None:
    with pytest.raises(ValidationError, match="requires NEXUS_AUTH_BACKEND=database"):
        Settings(
            NEXUS_ENV="production",
            JWT_SECRET_KEY="x" * 32,
            NEXUS_AUTH_BACKEND="local",
            NEXUS_ALLOW_PASSWORD_REGISTRATION=False,
            NEXUS_EMAIL_DELIVERY_MODE="disabled",
        )


def test_production_password_registration_requires_verified_smtp() -> None:
    with pytest.raises(ValidationError, match="requires verified SMTP"):
        Settings(
            NEXUS_ENV="production",
            JWT_SECRET_KEY="x" * 32,
            NEXUS_AUTH_BACKEND="database",
            NEXUS_ALLOW_PASSWORD_REGISTRATION=True,
            NEXUS_REQUIRE_EMAIL_VERIFICATION=False,
            NEXUS_EMAIL_DELIVERY_MODE="disabled",
        )


def test_smtp_starttls_uses_verified_certificate_context(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    observed: dict[str, ssl.SSLContext] = {}

    class FakeSMTP:
        def __init__(self, *_args, **_kwargs) -> None:
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args) -> None:
            pass

        def ehlo(self) -> None:
            pass

        def starttls(self, *, context: ssl.SSLContext) -> None:
            observed["context"] = context

        def login(self, *_args) -> None:
            pass

        def send_message(self, _message) -> None:
            pass

    monkeypatch.setattr("app.services.email_delivery.smtplib.SMTP", FakeSMTP)
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.test")
    monkeypatch.setattr(settings, "smtp_starttls", True)
    monkeypatch.setattr(settings, "smtp_username", "nexus")
    monkeypatch.setattr(settings, "smtp_password", "secret")

    _send_smtp(AccountEmail("pilot@example.test", "Verify", "Secure token link"))

    context = observed["context"]
    assert context.check_hostname is True
    assert context.verify_mode == ssl.CERT_REQUIRED


@pytest.mark.asyncio
async def test_github_activity_requires_nexus_authentication() -> None:
    transport = httpx.ASGITransport(app=create_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/integrations/github/example/nexus/activity")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_untrusted_host_is_rejected() -> None:
    transport = httpx.ASGITransport(app=create_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://attacker.example") as client:
        response = await client.get("/api/v1/health")
    assert response.status_code == 400


def test_production_disables_interactive_api_documentation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "env", "production")
    app = create_app()
    assert app.docs_url is None
    assert app.redoc_url is None
    assert app.openapi_url is None


@pytest.mark.asyncio
async def test_request_limit_rejects_streamed_body_without_content_length() -> None:
    called = False

    async def app(_scope, _receive, _send) -> None:
        nonlocal called
        called = True

    incoming = [
        {"type": "http.request", "body": b"123456", "more_body": True},
        {"type": "http.request", "body": b"789012", "more_body": False},
    ]
    sent: list[dict] = []

    async def receive() -> dict:
        return incoming.pop(0)

    async def send(message: dict) -> None:
        sent.append(message)

    middleware = RequestSizeLimitMiddleware(app, max_bytes=10)
    await middleware({"type": "http", "headers": []}, receive, send)

    assert called is False
    assert sent[0]["status"] == 413


@pytest.mark.asyncio
async def test_request_limit_replays_an_accepted_streamed_body() -> None:
    body = bytearray()

    async def app(_scope, receive, send) -> None:
        while True:
            message = await receive()
            body.extend(message.get("body", b""))
            if not message.get("more_body", False):
                break
        await send({"type": "http.response.start", "status": 204, "headers": []})
        await send({"type": "http.response.body", "body": b""})

    incoming = [
        {"type": "http.request", "body": b"1234", "more_body": True},
        {"type": "http.request", "body": b"5678", "more_body": False},
    ]
    sent: list[dict] = []

    async def receive() -> dict:
        return incoming.pop(0)

    async def send(message: dict) -> None:
        sent.append(message)

    middleware = RequestSizeLimitMiddleware(app, max_bytes=10)
    await middleware({"type": "http", "headers": []}, receive, send)

    assert body == b"12345678"
    assert sent[0]["status"] == 204
