from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.integration import GitHubCommitActivity, GitHubRepositoryActivity


GITHUB_API_URL = "https://api.github.com"
GITHUB_API_VERSION = "2022-11-28"


class GitHubIntegrationError(RuntimeError):
    pass


async def fetch_repository_activity(
    owner: str,
    repo: str,
    limit: int = 8,
    client: httpx.AsyncClient | None = None,
) -> GitHubRepositoryActivity:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "User-Agent": "Nexus-Project-OS",
    }
    if settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"

    owns_client = client is None
    active_client = client or httpx.AsyncClient(timeout=8.0)
    try:
        response = await active_client.get(
            f"{GITHUB_API_URL}/repos/{owner}/{repo}/commits",
            headers=headers,
            params={"per_page": limit},
        )
        if response.status_code == 404:
            raise GitHubIntegrationError("Repository not found or credentials lack access")
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, list):
            raise GitHubIntegrationError("GitHub returned an unexpected response")

        return GitHubRepositoryActivity(
            repository=f"{owner}/{repo}",
            commits=[parse_commit(item) for item in payload[:limit]],
            rate_limit_remaining=_parse_rate_limit(response.headers),
            authenticated=bool(settings.github_token),
        )
    except httpx.HTTPError as exc:
        raise GitHubIntegrationError("GitHub activity is temporarily unavailable") from exc
    finally:
        if owns_client:
            await active_client.aclose()


def parse_commit(payload: Mapping[str, Any]) -> GitHubCommitActivity:
    commit = payload.get("commit") or {}
    author = commit.get("author") or {}
    verification = commit.get("verification") or {}
    message = str(commit.get("message") or "Untitled commit").splitlines()[0]

    return GitHubCommitActivity(
        sha=str(payload.get("sha") or ""),
        message=message,
        author=str(author.get("name") or "Unknown"),
        committed_at=author.get("date"),
        url=str(payload.get("html_url") or ""),
        verified=bool(verification.get("verified", False)),
    )


def _parse_rate_limit(headers: httpx.Headers) -> int | None:
    value = headers.get("x-ratelimit-remaining")
    return int(value) if value and value.isdigit() else None
