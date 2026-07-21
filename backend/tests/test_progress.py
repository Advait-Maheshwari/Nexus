from datetime import UTC, datetime, timedelta

from app.domain.progress import (
    TaskSignal,
    calculate_completion,
    calculate_health_score,
    classify_health,
)
from app.models.enums import ProjectHealth, WorkStatus


def test_completion_rolls_done_tasks_into_percentage() -> None:
    tasks = [
        TaskSignal(status=WorkStatus.done),
        TaskSignal(status=WorkStatus.done),
        TaskSignal(status=WorkStatus.in_progress),
        TaskSignal(status=WorkStatus.backlog),
    ]

    assert calculate_completion(tasks) == 50.0


def test_health_penalizes_blocked_and_overdue_work() -> None:
    now = datetime.now(UTC)
    healthy = [
        TaskSignal(status=WorkStatus.done, estimate_minutes=60, time_spent_minutes=50),
        TaskSignal(status=WorkStatus.in_progress, due_date=now + timedelta(days=2)),
    ]
    unhealthy = [
        TaskSignal(status=WorkStatus.blocked, due_date=now - timedelta(days=2)),
        TaskSignal(status=WorkStatus.in_progress, due_date=now - timedelta(days=1)),
    ]

    assert calculate_health_score(healthy) > calculate_health_score(unhealthy)


def test_health_classification_boundaries() -> None:
    assert classify_health(85) == ProjectHealth.excellent
    assert classify_health(68) == ProjectHealth.stable
    assert classify_health(45) == ProjectHealth.at_risk
    assert classify_health(44.99) == ProjectHealth.critical
