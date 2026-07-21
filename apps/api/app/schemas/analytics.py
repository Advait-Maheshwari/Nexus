from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models.enums import Priority
from app.schemas.project import ProjectSummary


class MetricCard(BaseModel):
    label: str
    value: str
    delta: str
    tone: str


class AIRecommendation(BaseModel):
    title: str
    body: str
    confidence: float
    action_label: str


class ExecutionAction(BaseModel):
    task_id: str | None
    project_id: str | None
    project_name: str
    title: str
    reason: str
    action_type: Literal["unblock", "recover_deadline", "protect_deadline", "continue", "start"]
    priority: Priority
    score: int
    confidence: float
    due_date: datetime | None
    dependency_count: int = 0


class RiskSignal(BaseModel):
    key: str
    severity: Literal["critical", "high", "medium", "low"]
    title: str
    detail: str
    project_id: str | None = None
    task_id: str | None = None


class PortfolioForecast(BaseModel):
    status: Literal["empty", "on_track", "watch", "at_risk"]
    schedule_confidence: int
    completion_percent: int
    remaining_minutes: int
    overdue_tasks: int
    blocked_tasks: int
    summary: str


class ExecutionIntelligence(BaseModel):
    generated_at: datetime
    provider: str
    headline: str
    next_actions: list[ExecutionAction]
    risk_signals: list[RiskSignal]
    forecast: PortfolioForecast


class MissionControlSummary(BaseModel):
    metrics: list[MetricCard]
    projects: list[ProjectSummary]
    today_mission: list[str]
    ai_recommendations: list[AIRecommendation]
    activity: list[str]
    execution_intelligence: ExecutionIntelligence

