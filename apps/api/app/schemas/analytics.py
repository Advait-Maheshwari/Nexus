from pydantic import BaseModel

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


class MissionControlSummary(BaseModel):
    metrics: list[MetricCard]
    projects: list[ProjectSummary]
    today_mission: list[str]
    ai_recommendations: list[AIRecommendation]
    activity: list[str]

