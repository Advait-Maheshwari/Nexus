from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from html import unescape
from urllib.parse import urljoin
from urllib.request import Request, urlopen


DEFAULT_WEB_URL = "https://nexus-advait-pm.web.app/"
DEFAULT_API_URL = "https://nexus-api-7fgu.onrender.com"
SCRIPT_SOURCE = re.compile(r'<script[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)


@dataclass(frozen=True)
class Response:
    url: str
    status: int
    headers: dict[str, str]
    body: bytes


def fetch(url: str, timeout: float) -> Response:
    request = Request(url, headers={"User-Agent": "Nexus-Deployment-Verifier/1.0"})
    with urlopen(request, timeout=timeout) as response:
        return Response(
            url=response.url,
            status=response.status,
            headers={key.lower(): value for key, value in response.headers.items()},
            body=response.read(),
        )


def require_headers(response: Response, expected: dict[str, str]) -> list[str]:
    failures: list[str] = []
    for name, value in expected.items():
        actual = response.headers.get(name)
        if actual is None:
            failures.append(f"{response.url} is missing {name}")
        elif value.lower() not in actual.lower():
            failures.append(f"{response.url} has unexpected {name}: {actual}")
    return failures


def verify(web_url: str, api_url: str, timeout: float) -> list[str]:
    failures: list[str] = []
    api_origin = api_url.rstrip("/")
    ready = fetch(f"{api_origin}/api/v1/ready", timeout)
    if ready.status != 200:
        failures.append(f"API readiness returned HTTP {ready.status}")
    else:
        payload = json.loads(ready.body)
        if payload.get("status") != "ready" or payload.get("database") != "database":
            failures.append(f"API readiness payload is unexpected: {payload}")
    failures.extend(
        require_headers(
            ready,
            {
                "x-content-type-options": "nosniff",
                "x-frame-options": "DENY",
                "content-security-policy": "default-src 'none'",
                "strict-transport-security": "max-age=31536000",
            },
        )
    )

    web = fetch(web_url.rstrip("/") + "/", timeout)
    if web.status != 200:
        failures.append(f"Web app returned HTTP {web.status}")
    failures.extend(
        require_headers(
            web,
            {
                "x-content-type-options": "nosniff",
                "x-frame-options": "DENY",
                "referrer-policy": "no-referrer",
            },
        )
    )

    html = web.body.decode("utf-8", errors="replace")
    scripts = [urljoin(web.url, unescape(path)) for path in SCRIPT_SOURCE.findall(html)]
    if not scripts:
        failures.append("Web app HTML does not reference a JavaScript bundle")
        return failures

    bundles = [fetch(script, timeout).body.decode("utf-8", errors="replace") for script in scripts]
    if not any(api_origin in bundle for bundle in bundles):
        failures.append(f"No JavaScript bundle references the API origin {api_origin}")
    if any(":8000" in bundle for bundle in bundles):
        failures.append("A production JavaScript bundle contains the local :8000 API fallback")
    return failures


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify the live Nexus zero-cost deployment.")
    parser.add_argument("--web-url", default=DEFAULT_WEB_URL)
    parser.add_argument("--api-url", default=DEFAULT_API_URL)
    parser.add_argument("--timeout", type=float, default=30.0)
    args = parser.parse_args()

    try:
        failures = verify(args.web_url, args.api_url, args.timeout)
    except Exception as error:
        print(f"FAIL: deployment verification could not complete: {error}", file=sys.stderr)
        return 1

    if failures:
        for failure in failures:
            print(f"FAIL: {failure}", file=sys.stderr)
        return 1

    print(f"PASS: web={args.web_url} api={args.api_url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
