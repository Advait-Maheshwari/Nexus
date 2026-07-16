from __future__ import annotations

import json

from ops import verify_deployment


WEB_URL = "https://nexus-advait-pm.web.app/"
API_URL = "https://nexus-api-7fgu.onrender.com"


def response(url: str, body: str, headers: dict[str, str] | None = None) -> verify_deployment.Response:
    return verify_deployment.Response(
        url=url,
        status=200,
        headers=headers or {},
        body=body.encode(),
    )


def install_responses(monkeypatch, bundle: str) -> None:
    api_headers = {
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
        "strict-transport-security": "max-age=31536000; includeSubDomains",
    }
    web_headers = {
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "no-referrer",
    }
    responses = {
        f"{API_URL}/api/v1/ready": response(
            f"{API_URL}/api/v1/ready",
            json.dumps({"status": "ready", "database": "database"}),
            api_headers,
        ),
        WEB_URL: response(
            WEB_URL,
            '<html><script type="module" src="/assets/app.js"></script></html>',
            web_headers,
        ),
        f"{WEB_URL}assets/app.js": response(f"{WEB_URL}assets/app.js", bundle),
    }
    monkeypatch.setattr(verify_deployment, "fetch", lambda url, _timeout: responses[url])


def test_verify_deployment_accepts_cloud_api_bundle(monkeypatch) -> None:
    install_responses(monkeypatch, f'const API_URL="{API_URL}";')

    assert verify_deployment.verify(WEB_URL, API_URL, 1) == []


def test_verify_deployment_rejects_stale_or_local_bundle(monkeypatch) -> None:
    install_responses(monkeypatch, 'const API_URL="http://localhost:8000";')

    failures = verify_deployment.verify(WEB_URL, API_URL, 1)

    assert any("No JavaScript bundle references" in failure for failure in failures)
    assert any("local :8000 API fallback" in failure for failure in failures)
