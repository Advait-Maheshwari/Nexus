from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class AIResponse:
    title: str
    body: str
    confidence: float
    provider: str


class AIPlanner(Protocol):
    async def suggest_next_task(self, project_id: str) -> AIResponse:
        ...

    async def estimate_completion(self, project_id: str) -> AIResponse:
        ...

    async def detect_bottlenecks(self, project_id: str) -> AIResponse:
        ...

    async def generate_daily_briefing(self, user_id: str) -> AIResponse:
        ...


class LocalHeuristicPlanner:
    """Default zero-cost planner.

    This implementation uses deterministic project signals and templates.
    Paid provider adapters can be added later, but they must remain optional.
    """

    async def suggest_next_task(self, project_id: str) -> AIResponse:
        return AIResponse(
            title="Build the task spine",
            body=f"Project {project_id} should finish task CRUD before advanced AI automation.",
            confidence=0.72,
            provider="local-heuristic",
        )

    async def estimate_completion(self, project_id: str) -> AIResponse:
        return AIResponse(
            title="Completion estimate",
            body=f"Project {project_id} needs real velocity history before a reliable prediction.",
            confidence=0.48,
            provider="local-heuristic",
        )

    async def detect_bottlenecks(self, project_id: str) -> AIResponse:
        return AIResponse(
            title="Potential bottleneck",
            body=f"Project {project_id} may bottleneck around unclear milestones.",
            confidence=0.61,
            provider="local-heuristic",
        )

    async def generate_daily_briefing(self, user_id: str) -> AIResponse:
        return AIResponse(
            title="Daily briefing",
            body=f"User {user_id} should focus on one critical project and one cleanup task today.",
            confidence=0.66,
            provider="local-heuristic",
        )
