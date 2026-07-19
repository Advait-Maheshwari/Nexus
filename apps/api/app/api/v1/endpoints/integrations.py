from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from app.core.security import AuthContext, require_auth_context
from app.schemas.integration import GitHubRepositoryActivity
from app.services.github import GitHubIntegrationError, fetch_repository_activity

router = APIRouter()


@router.get(
    "/github/{owner}/{repo}/activity",
    response_model=GitHubRepositoryActivity,
)
async def github_repository_activity(
    owner: str = Path(pattern=r"^[A-Za-z0-9_.-]+$"),
    repo: str = Path(pattern=r"^[A-Za-z0-9_.-]+$"),
    limit: int = Query(default=8, ge=1, le=20),
    _auth: AuthContext = Depends(require_auth_context),
) -> GitHubRepositoryActivity:
    try:
        return await fetch_repository_activity(owner, repo, limit)
    except GitHubIntegrationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
