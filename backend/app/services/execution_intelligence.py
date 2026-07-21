from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Iterable

from app.models.enums import Priority, WorkStatus
from app.schemas.analytics import (
    ExecutionAction,
    ExecutionIntelligence,
    PortfolioForecast,
    RiskSignal,
)
from app.schemas.project import ProjectSummary


@dataclass(frozen=True)
class ExecutionTask:
    id: str
    project_id: str
    project_name: str
    title: str
    status: str
    priority: str
    estimate_minutes: int
    time_spent_minutes: int
    due_date: datetime | None
    blocked_reason: str | None = None
    dependency_titles: tuple[str, ...] = ()


def build_execution_intelligence(
    projects: list[ProjectSummary],
    tasks: Iterable[ExecutionTask],
    *,
    now: datetime | None = None,
) -> ExecutionIntelligence:
    generated_at = _as_utc(now or datetime.now(UTC))
    task_list = list(tasks)
    open_tasks = [
        task
        for task in task_list
        if task.status not in {WorkStatus.done.value, WorkStatus.archived.value}
    ]
    ranked = sorted(
        (_rank_task(task, generated_at) for task in open_tasks),
        key=lambda item: (
            -item.score,
            item.due_date is None,
            _as_utc(item.due_date) if item.due_date else datetime.max.replace(tzinfo=UTC),
            item.title.casefold(),
            item.task_id or "",
        ),
    )
    next_actions = [item for item in ranked[:5]]
    overdue_tasks = sum(_is_overdue(task, generated_at) for task in open_tasks)
    blocked_task_ids = {
        task.id
        for task in open_tasks
        if task.status == WorkStatus.blocked.value or task.dependency_titles
    }
    remaining_minutes = sum(
        max(task.estimate_minutes - task.time_spent_minutes, 0) for task in open_tasks
    )
    completed_tasks = sum(task.status == WorkStatus.done.value for task in task_list)
    completion_percent = (
        round((completed_tasks / len(task_list)) * 100) if task_list else 0
    )

    urgent_projects = [
        project
        for project in projects
        if _project_is_at_risk(project, generated_at)
    ]
    if not projects:
        schedule_confidence = 0
        forecast_status = "empty"
        summary = "Create a project and one finishable task to establish a forecast."
    elif not open_tasks:
        schedule_confidence = 100
        forecast_status = "on_track"
        summary = "All tracked tasks are complete. Define the next outcome before expanding scope."
    else:
        schedule_confidence = max(
            20,
            min(
                98,
                94
                - overdue_tasks * 12
                - len(blocked_task_ids) * 9
                - len(urgent_projects) * 8,
            ),
        )
        forecast_status = (
            "at_risk"
            if schedule_confidence < 55
            else "watch"
            if schedule_confidence < 75
            else "on_track"
        )
        effort_hours = remaining_minutes / 60
        summary = (
            f"{len(open_tasks)} open task{'s' if len(open_tasks) != 1 else ''}, "
            f"{effort_hours:.1f}h estimated effort remaining, and "
            f"{len(blocked_task_ids)} blocked path"
            f"{'s' if len(blocked_task_ids) != 1 else ''}."
        )

    risks = _build_risk_signals(
        open_tasks,
        overdue_tasks=overdue_tasks,
        blocked_task_ids=blocked_task_ids,
        urgent_projects=urgent_projects,
        now=generated_at,
    )
    headline = (
        f"Start with {next_actions[0].title}. {next_actions[0].reason}"
        if next_actions
        else "No open execution signal. Define the next measurable outcome."
    )

    return ExecutionIntelligence(
        generated_at=generated_at,
        provider="nexus_local_heuristic_v1",
        headline=headline,
        next_actions=next_actions,
        risk_signals=risks,
        forecast=PortfolioForecast(
            status=forecast_status,
            schedule_confidence=schedule_confidence,
            completion_percent=completion_percent,
            remaining_minutes=remaining_minutes,
            overdue_tasks=overdue_tasks,
            blocked_tasks=len(blocked_task_ids),
            summary=summary,
        ),
    )


def _rank_task(task: ExecutionTask, now: datetime) -> ExecutionAction:
    score = {
        Priority.critical.value: 48,
        Priority.high.value: 34,
        Priority.medium.value: 20,
        Priority.low.value: 8,
    }.get(task.priority, 12)
    reasons: list[str] = []
    due_date = _as_utc(task.due_date) if task.due_date else None
    overdue = bool(due_date and due_date < now)
    days_to_due = (due_date - now).days if due_date else None

    if task.status == WorkStatus.blocked.value or task.dependency_titles:
        score += 44
        action_type = "unblock"
        if task.dependency_titles:
            names = ", ".join(task.dependency_titles[:2])
            suffix = " and more" if len(task.dependency_titles) > 2 else ""
            reasons.append(f"Clear {len(task.dependency_titles)} dependency: {names}{suffix}.")
        elif task.blocked_reason:
            reasons.append(f"Resolve blocker: {_compact(task.blocked_reason)}.")
        else:
            reasons.append("Resolve the recorded blocker before starting more work.")
    elif overdue:
        score += 38
        action_type = "recover_deadline"
        reasons.append(f"Overdue by {max(1, (now - due_date).days)} day(s).")
    elif days_to_due is not None and days_to_due <= 3:
        score += 28
        action_type = "protect_deadline"
        reasons.append(f"Due within {max(0, days_to_due)} day(s).")
    elif task.status == WorkStatus.in_progress.value:
        score += 24
        action_type = "continue"
        reasons.append("Already in progress; finish before opening more scope.")
    else:
        action_type = "start"
        reasons.append(f"{task.priority.capitalize()} priority and ready for focused execution.")

    if task.time_spent_minutes > task.estimate_minutes > 0:
        score += 10
        reasons.append("Recorded time has exceeded the estimate.")
    confidence = min(0.98, round(0.72 + min(score, 100) / 400, 2))

    return ExecutionAction(
        task_id=task.id,
        project_id=task.project_id,
        project_name=task.project_name,
        title=task.title,
        reason=" ".join(reasons),
        action_type=action_type,
        priority=task.priority,
        score=score,
        confidence=confidence,
        due_date=due_date,
        dependency_count=len(task.dependency_titles),
    )


def _build_risk_signals(
    open_tasks: list[ExecutionTask],
    *,
    overdue_tasks: int,
    blocked_task_ids: set[str],
    urgent_projects: list[ProjectSummary],
    now: datetime,
) -> list[RiskSignal]:
    signals: list[RiskSignal] = []
    if overdue_tasks:
        most_overdue = min(
            (task for task in open_tasks if _is_overdue(task, now)),
            key=lambda task: _as_utc(task.due_date),
        )
        signals.append(
            RiskSignal(
                key="overdue_tasks",
                severity="critical",
                title=f"{overdue_tasks} overdue task{'s' if overdue_tasks != 1 else ''}",
                detail=f"{most_overdue.title} is the oldest visible deadline breach.",
                project_id=most_overdue.project_id,
                task_id=most_overdue.id,
            )
        )
    if blocked_task_ids:
        first_blocked = next(task for task in open_tasks if task.id in blocked_task_ids)
        signals.append(
            RiskSignal(
                key="blocked_paths",
                severity="high",
                title=f"{len(blocked_task_ids)} blocked path{'s' if len(blocked_task_ids) != 1 else ''}",
                detail=f"Begin recovery with {first_blocked.title}.",
                project_id=first_blocked.project_id,
                task_id=first_blocked.id,
            )
        )
    if urgent_projects:
        project = min(
            urgent_projects,
            key=lambda item: _parse_deadline(item.deadline) or datetime.max.replace(tzinfo=UTC),
        )
        signals.append(
            RiskSignal(
                key="project_deadline",
                severity="high",
                title=f"{project.name} needs a scope check",
                detail=(
                    f"The deadline is close while tracked completion is {project.progress:.0f}% "
                    f"and health is {project.health_score:.0f}/100."
                ),
                project_id=project.id,
            )
        )
    return signals[:4]


def _project_is_at_risk(project: ProjectSummary, now: datetime) -> bool:
    deadline = _parse_deadline(project.deadline)
    if not deadline or project.progress >= 100:
        return False
    days = (deadline - now).days
    return days < 0 or (days <= 14 and (project.progress < 70 or project.health_score < 75))


def _is_overdue(task: ExecutionTask, now: datetime) -> bool:
    return bool(task.due_date and _as_utc(task.due_date) < now)


def _parse_deadline(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return _as_utc(datetime.fromisoformat(value.replace("Z", "+00:00")))
    except ValueError:
        return None


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _compact(value: str, limit: int = 140) -> str:
    compact = " ".join(value.split())
    return compact if len(compact) <= limit else f"{compact[: limit - 3]}..."
