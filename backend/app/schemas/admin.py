from datetime import datetime

from pydantic import BaseModel


class AdminSessionSummary(BaseModel):
    id: str
    user_id: str
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None = None
    active: bool
    current: bool


class AdminWorkspaceUser(BaseModel):
    user_id: str
    full_name: str
    email: str
    avatar_url: str | None = None
    role: str
    joined_at: datetime
    account_created_at: datetime
    account_updated_at: datetime
    is_active: bool
    email_verified: bool
    password_enabled: bool
    google_enabled: bool
    last_login_at: datetime | None = None
    active_session_count: int
    total_session_count: int


class AdminWorkspaceDashboard(BaseModel):
    workspace_id: str
    workspace_name: str
    generated_at: datetime
    total_users: int
    active_session_count: int
    users: list[AdminWorkspaceUser]
    active_sessions: list[AdminSessionSummary]
