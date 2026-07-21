from datetime import datetime

from pydantic import BaseModel


class GitHubCommitActivity(BaseModel):
    sha: str
    message: str
    author: str
    committed_at: datetime
    url: str
    verified: bool


class GitHubRepositoryActivity(BaseModel):
    repository: str
    commits: list[GitHubCommitActivity]
    rate_limit_remaining: int | None = None
    authenticated: bool
