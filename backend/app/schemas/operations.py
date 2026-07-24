from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

BriefingType = Literal["daily", "weekly"]
AutomationCadence = Literal["daily", "weekly"]


class BriefingContent(BaseModel):
    headline: str
    focus: str
    next_task: str
    bottleneck: str
    health_narrative: str
    action_plan: list[str]
    project_count: int
    risk_count: int
    blocked_task_count: int
    team_headline: str


class BriefingSnapshotRead(BaseModel):
    id: str
    briefing_type: BriefingType
    period_key: str
    provider: str
    content: BriefingContent
    created_at: datetime
    updated_at: datetime


class BriefingGenerateRequest(BaseModel):
    briefing_type: BriefingType
    refresh_existing: bool = False


class AutomationRuleCreate(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    briefing_type: BriefingType
    cadence: AutomationCadence

    @model_validator(mode="after")
    def cadence_matches_output(self) -> "AutomationRuleCreate":
        if self.briefing_type != self.cadence:
            raise ValueError("Briefing type and cadence must match")
        return self


class AutomationRuleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=120)
    enabled: bool | None = None


class AutomationRuleRead(BaseModel):
    id: str
    name: str
    briefing_type: BriefingType
    cadence: AutomationCadence
    enabled: bool
    max_runs_per_period: int
    last_run_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AutomationPreviewRead(BaseModel):
    rule_id: str
    period_key: str
    due: bool
    would_create_snapshot: bool
    reason: str
    action_summary: str


class AutomationExecuteRequest(BaseModel):
    confirm: bool


class AutomationRunRead(BaseModel):
    id: str
    rule_id: str
    mode: Literal["execute"]
    status: Literal["completed", "skipped"]
    period_key: str
    output_snapshot_id: str | None
    decision: dict
    created_at: datetime


class AIProviderStatus(BaseModel):
    provider: Literal["local", "openai", "anthropic", "google"]
    label: str
    configured: bool
    enabled: bool
    execution_mode: Literal["active", "disabled"]
    detail: str


class OperationsOverview(BaseModel):
    snapshots: list[BriefingSnapshotRead]
    rules: list[AutomationRuleRead]
    recent_runs: list[AutomationRunRead]
    providers: list[AIProviderStatus]
