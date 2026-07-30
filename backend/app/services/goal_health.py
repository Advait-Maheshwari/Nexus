from __future__ import annotations

from datetime import UTC, datetime
from typing import Any


def calculate_goal_aware_health(
    *,
    base_health_score: float,
    progress: float,
    task_count: int,
    blocked_task_count: int,
    open_task_ids: set[str],
    deadline: datetime | None,
    blueprint: dict[str, Any] | None,
    now: datetime | None = None,
) -> float:
    """Blend operational health with the project blueprint's goal clarity and ownership."""
    current_time = _as_utc(now or datetime.now(UTC))
    score = float(base_health_score)
    blueprint = blueprint or {}
    goals = [goal for goal in blueprint.get("goals", []) if isinstance(goal, dict)]
    steps = [step for step in blueprint.get("steps", []) if isinstance(step, dict)]
    teams = [team for team in blueprint.get("teams", []) if isinstance(team, dict)]

    if not _meaningful_text(blueprint.get("vision")):
        score -= 14
    if not _meaningful_text(blueprint.get("definition_of_done")):
        score -= 14
    if not _meaningful_text(blueprint.get("strategy")):
        score -= 8

    if goals:
        completed_goals = sum(bool(goal.get("completed")) for goal in goals)
        goal_completion = completed_goals / len(goals)
        task_completion = max(0.0, min(float(progress) / 100, 1.0))
        score += (goal_completion - task_completion) * 18
        if task_completion >= 0.5 and goal_completion == 0:
            score -= 10
    else:
        score -= 18

    if steps:
        critical_open = sum(
            step.get("priority") == "critical" and step.get("status") != "done"
            for step in steps
        )
        active_steps = sum(step.get("status") == "active" for step in steps)
        done_steps = sum(step.get("status") == "done" for step in steps)
        if critical_open:
            score -= min(critical_open * 6, 18)
        if active_steps == 0 and done_steps < len(steps):
            score -= 8
    else:
        score -= 12

    if task_count == 0:
        score = min(score, 62)
    if blocked_task_count:
        score -= min(blocked_task_count * 8, 24)

    if deadline:
        days_remaining = (_as_utc(deadline) - current_time).days
        incomplete_goal_count = sum(not bool(goal.get("completed")) for goal in goals)
        incomplete_step_count = sum(step.get("status") != "done" for step in steps)
        if days_remaining < 0 and (incomplete_goal_count or incomplete_step_count or progress < 100):
            score -= 24
        elif days_remaining <= 7 and (incomplete_goal_count or incomplete_step_count):
            score -= 16
        elif days_remaining <= 14 and progress < 70:
            score -= 8

    assigned_task_ids = _assigned_task_ids(teams)
    unowned_open_tasks = len(open_task_ids - assigned_task_ids)
    if unowned_open_tasks:
        score -= min(unowned_open_tasks * 5, 20)

    subteam_count = sum(
        len(team.get("subteams", []))
        for team in teams
        if isinstance(team.get("subteams", []), list)
    )
    if teams and subteam_count == 0 and task_count >= 8:
        score -= 6

    return round(max(0, min(score, 100)), 1)


def blueprint_to_health_payload(blueprint: Any) -> dict[str, Any]:
    return {
        "vision": getattr(blueprint, "vision", ""),
        "definition_of_done": getattr(blueprint, "definition_of_done", ""),
        "strategy": getattr(blueprint, "strategy", ""),
        "goals": getattr(blueprint, "goals", []),
        "steps": getattr(blueprint, "steps", []),
        "teams": getattr(blueprint, "teams", []),
    }


def _assigned_task_ids(teams: list[dict[str, Any]]) -> set[str]:
    assigned: set[str] = set()
    for team in teams:
        assigned.update(task_id for task_id in team.get("task_ids", []) if isinstance(task_id, str))
        for subteam in team.get("subteams", []):
            if isinstance(subteam, dict):
                assigned.update(
                    task_id for task_id in subteam.get("task_ids", []) if isinstance(task_id, str)
                )
    return assigned


def _meaningful_text(value: object) -> bool:
    return isinstance(value, str) and len(value.strip()) >= 12


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
