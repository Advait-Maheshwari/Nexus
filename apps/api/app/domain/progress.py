from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime

from app.models.enums import ProjectHealth, WorkStatus


@dataclass(frozen=True)
class TaskSignal:
    status: WorkStatus
    due_date: datetime | None = None
    time_spent_minutes: int = 0
    estimate_minutes: int = 0


def calculate_completion(tasks: Iterable[TaskSignal]) -> float:
    task_list = list(tasks)
    if not task_list:
        return 0.0

    done_count = sum(1 for task in task_list if task.status == WorkStatus.done)
    return round((done_count / len(task_list)) * 100, 2)


def calculate_health_score(tasks: Iterable[TaskSignal], target_velocity: float = 5.0) -> float:
    task_list = list(tasks)
    if not task_list:
        return 100.0

    now = datetime.now(UTC)
    completion = calculate_completion(task_list)
    blocked = sum(1 for task in task_list if task.status == WorkStatus.blocked)
    overdue = sum(
        1
        for task in task_list
        if task.due_date and task.due_date < now and task.status != WorkStatus.done
    )
    done_velocity = sum(1 for task in task_list if task.status == WorkStatus.done)
    velocity_score = min(20.0, (done_velocity / max(target_velocity, 1.0)) * 20.0)

    score = 35.0 + (completion * 0.35) + velocity_score
    score -= blocked * 8.0
    score -= overdue * 10.0
    return round(max(0.0, min(100.0, score)), 2)


def classify_health(score: float) -> ProjectHealth:
    if score >= 85:
        return ProjectHealth.excellent
    if score >= 68:
        return ProjectHealth.stable
    if score >= 45:
        return ProjectHealth.at_risk
    return ProjectHealth.critical

