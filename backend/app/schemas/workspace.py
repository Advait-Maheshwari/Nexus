from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import WorkspaceRole


class WorkspaceSummary(BaseModel):
    id: str
    name: str
    role: WorkspaceRole
    plan_code: str


class WorkspaceUsage(BaseModel):
    plan_code: str
    projects: int
    project_limit: int
    tasks: int
    task_limit: int
    members: int
    member_limit: int


class WorkspaceMemberRead(BaseModel):
    user_id: str
    full_name: str
    email: str
    role: WorkspaceRole
    joined_at: datetime


class WorkspaceMemberUpdate(BaseModel):
    role: WorkspaceRole


class WorkspaceInvitationCreate(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    role: WorkspaceRole = WorkspaceRole.member

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        local, separator, domain = normalized.partition("@")
        if not separator or not local or "." not in domain:
            raise ValueError("Enter a valid email address")
        return normalized

    @field_validator("role")
    @classmethod
    def prevent_owner_invite(cls, value: WorkspaceRole) -> WorkspaceRole:
        if value == WorkspaceRole.owner:
            raise ValueError("Ownership cannot be assigned by invitation")
        return value


class WorkspaceInvitationRead(BaseModel):
    id: str
    email: str
    role: WorkspaceRole
    expires_at: datetime
    accepted_at: datetime | None
    revoked_at: datetime | None
    invite_token: str | None = None


class WorkspaceInvitationAccept(BaseModel):
    invite_token: str = Field(min_length=40, max_length=256)


class WorkspaceSwitchRequest(BaseModel):
    workspace_id: str = Field(min_length=36, max_length=36)
