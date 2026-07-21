from enum import Enum


class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class WorkStatus(str, Enum):
    backlog = "backlog"
    ready = "ready"
    in_progress = "in_progress"
    blocked = "blocked"
    done = "done"
    archived = "archived"


class ProjectHealth(str, Enum):
    excellent = "excellent"
    stable = "stable"
    at_risk = "at_risk"
    critical = "critical"


class WorkspaceRole(str, Enum):
    owner = "owner"
    admin = "admin"
    member = "member"
    viewer = "viewer"


class ActivityAction(str, Enum):
    created = "created"
    updated = "updated"
    completed = "completed"
    blocked = "blocked"
    unblocked = "unblocked"
    archived = "archived"
    ai_generated = "ai_generated"

