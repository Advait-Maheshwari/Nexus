from __future__ import annotations

from datetime import UTC, datetime
from typing import Iterable, Mapping

from app.models.enums import Priority, WorkStatus
from app.schemas.analytics import TeamDeliverySignal, TeamIntelligence
from app.schemas.project import ProjectSummary
from app.services.execution_intelligence import ExecutionTask

STATE_ORDER = {
    "lagging": 0,
    "watch": 1,
    "unassigned": 2,
    "on_track": 3,
}


def build_team_intelligence(
    projects: list[ProjectSummary],
    tasks: Iterable[ExecutionTask],
    teams_by_project: Mapping[str, list[dict]],
    *,
    now: datetime | None = None,
) -> TeamIntelligence:
    generated_at = _as_utc(now or datetime.now(UTC))
    tasks_by_project: dict[str, list[ExecutionTask]] = {}
    for task in tasks:
        tasks_by_project.setdefault(task.project_id, []).append(task)

    signals: list[TeamDeliverySignal] = []
    unassigned_tasks = 0

    for project in projects:
        project_tasks = tasks_by_project.get(project.id, [])
        task_by_id = {task.id: task for task in project_tasks}
        assigned_ids: set[str] = set()

        for raw_team in teams_by_project.get(project.id, []):
            task_ids = [
                task_id
                for task_id in _team_task_ids(raw_team)
                if isinstance(task_id, str)
            ]
            assigned_tasks = [task_by_id[task_id] for task_id in task_ids if task_id in task_by_id]
            assigned_ids.update(task.id for task in assigned_tasks)
            signals.append(
                _build_team_signal(
                    project,
                    raw_team,
                    assigned_tasks,
                    generated_at,
                )
            )

        unassigned_tasks += sum(
            task.id not in assigned_ids
            and task.status not in {WorkStatus.done.value, WorkStatus.archived.value}
            for task in project_tasks
        )

    signals.sort(
        key=lambda signal: (
            STATE_ORDER[signal.state],
            -signal.remaining_minutes,
            signal.project_name.casefold(),
            signal.team_name.casefold(),
        )
    )
    lagging_teams = sum(signal.state == "lagging" for signal in signals)
    total_teams = len(signals)

    if lagging_teams:
        first = next(signal for signal in signals if signal.state == "lagging")
        headline = (
            f"{lagging_teams} team{'s' if lagging_teams != 1 else ''} need recovery. "
            f"Start with {first.team_name} on {first.project_name}."
        )
    elif unassigned_tasks:
        headline = (
            f"{unassigned_tasks} open task{'s' if unassigned_tasks != 1 else ''} "
            "need a team owner before more scope is added."
        )
    elif total_teams:
        headline = "Team ownership is balanced; protect the active work before adding scope."
    elif projects:
        headline = "Define the first delivery team and assign each open task to one owner."
    else:
        headline = "Team intelligence starts when the first project has tracked work."

    return TeamIntelligence(
        generated_at=generated_at,
        provider="nexus_local_team_heuristic_v1",
        headline=headline,
        total_teams=total_teams,
        lagging_teams=lagging_teams,
        unassigned_tasks=unassigned_tasks,
        signals=signals,
    )


def _build_team_signal(
    project: ProjectSummary,
    raw_team: dict,
    assigned_tasks: list[ExecutionTask],
    now: datetime,
) -> TeamDeliverySignal:
    tracked_tasks = [
        task for task in assigned_tasks if task.status != WorkStatus.archived.value
    ]
    open_tasks = [
        task for task in tracked_tasks if task.status != WorkStatus.done.value
    ]
    completed_tasks = [
        task for task in tracked_tasks if task.status == WorkStatus.done.value
    ]
    blocked_tasks = [
        task
        for task in open_tasks
        if task.status == WorkStatus.blocked.value or task.dependency_titles
    ]
    overdue_tasks = [
        task
        for task in open_tasks
        if task.due_date is not None and _as_utc(task.due_date) < now
    ]
    active_tasks = [
        task for task in open_tasks if task.status == WorkStatus.in_progress.value
    ]
    remaining_minutes = sum(
        max(task.estimate_minutes - task.time_spent_minutes, 0)
        for task in open_tasks
    )
    completion_percent = (
        round((len(completed_tasks) / len(tracked_tasks)) * 100)
        if tracked_tasks
        else 0
    )
    delivery_gap = project.progress - completion_percent
    priority_pressure = any(
        task.priority in {Priority.critical.value, Priority.high.value}
        for task in open_tasks
    )

    if not tracked_tasks:
        state = "unassigned"
    elif blocked_tasks or overdue_tasks or (len(tracked_tasks) >= 2 and delivery_gap >= 25):
        state = "lagging"
    elif delivery_gap >= 10 or (open_tasks and not active_tasks) or priority_pressure:
        state = "watch"
    else:
        state = "on_track"

    capacity_score = max(
        5,
        min(
            100,
            100
            - min(len(open_tasks) * 8, 40)
            - len(blocked_tasks) * 18
            - len(overdue_tasks) * 20
            - (10 if open_tasks and not active_tasks else 0),
        ),
    )

    return TeamDeliverySignal(
        project_id=project.id,
        project_name=project.name,
        team_id=_text(raw_team.get("id"), "team"),
        team_name=_text(raw_team.get("name"), "Unnamed team"),
        lead=_text(raw_team.get("lead"), "Unassigned lead"),
        responsibility=_text(
            raw_team.get("responsibility"),
            "Delivery responsibility has not been defined.",
        ),
        subteam_count=_subteam_count(raw_team),
        state=state,
        assigned_task_count=len(tracked_tasks),
        assigned_task_titles=[task.title for task in tracked_tasks[:4]],
        open_task_count=len(open_tasks),
        completed_task_count=len(completed_tasks),
        blocked_task_count=len(blocked_tasks),
        overdue_task_count=len(overdue_tasks),
        remaining_minutes=remaining_minutes,
        completion_percent=completion_percent,
        capacity_score=capacity_score,
        recovery_action=_recovery_action(
            raw_team,
            open_tasks,
            blocked_tasks,
            overdue_tasks,
            state,
        ),
    )


def _team_task_ids(raw_team: dict) -> list[str]:
    direct_ids = raw_team.get("task_ids", [])
    if not isinstance(direct_ids, list):
        direct_ids = []
    subteam_ids = [
        task_id
        for subteam in raw_team.get("subteams", [])
        if isinstance(subteam, dict)
        for task_id in subteam.get("task_ids", [])
    ]
    return [
        task_id
        for task_id in [*direct_ids, *subteam_ids]
        if isinstance(task_id, str)
    ]


def _subteam_count(raw_team: dict) -> int:
    subteams = raw_team.get("subteams", [])
    if not isinstance(subteams, list):
        return 0
    return sum(isinstance(subteam, dict) for subteam in subteams)


def _recovery_action(
    raw_team: dict,
    open_tasks: list[ExecutionTask],
    blocked_tasks: list[ExecutionTask],
    overdue_tasks: list[ExecutionTask],
    state: str,
) -> str:
    lead = _text(raw_team.get("lead"), "The team lead")
    subteams = [subteam for subteam in raw_team.get("subteams", []) if isinstance(subteam, dict)]
    subteam_note = ""
    if subteams:
        subteam_note = f" across {len(subteams)} sub-team{'s' if len(subteams) != 1 else ''}"
    if state == "unassigned":
        return f"{lead} should claim one finishable task or remove this empty team."
    if blocked_tasks:
        return f"{lead} should clear the blocker on {blocked_tasks[0].title}{subteam_note} before starting more work."
    if overdue_tasks:
        return f"{lead} should rescope or recover the deadline for {overdue_tasks[0].title}{subteam_note}."
    if state == "watch" and open_tasks:
        return f"{lead} should move {open_tasks[0].title}{subteam_note} into a clear active or blocked state."
    if open_tasks:
        return f"{lead} should protect the current flow and finish {open_tasks[0].title}."
    return f"{lead} should define the team's next measurable outcome."


def _text(value: object, fallback: str) -> str:
    return value.strip() if isinstance(value, str) and value.strip() else fallback


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
