from datetime import UTC, datetime

from app.models.enums import Priority, ProjectHealth, WorkStatus
from app.schemas.project import ProjectSummary
from app.services.execution_intelligence import ExecutionTask, build_execution_intelligence


def _project(*, deadline: str | None = None, progress: float = 35) -> ProjectSummary:
    return ProjectSummary(
        id="project-nexus",
        name="Nexus",
        codename="ORION",
        status=WorkStatus.in_progress,
        health=ProjectHealth.stable,
        health_score=72,
        progress=progress,
        priority=Priority.high,
        deadline=deadline,
        time_spent_minutes=120,
        velocity=2,
        feature_count=2,
        task_count=3,
        blocked_task_count=1,
    )


def test_execution_intelligence_ranks_deadlines_and_explains_dependencies() -> None:
    now = datetime(2026, 7, 20, 12, tzinfo=UTC)
    intelligence = build_execution_intelligence(
        [_project(deadline="2026-07-25T12:00:00+00:00")],
        [
            ExecutionTask(
                id="overdue",
                project_id="project-nexus",
                project_name="Nexus",
                title="Recover production release",
                status=WorkStatus.ready.value,
                priority=Priority.high.value,
                estimate_minutes=120,
                time_spent_minutes=30,
                due_date=datetime(2026, 7, 18, 12, tzinfo=UTC),
            ),
            ExecutionTask(
                id="blocked",
                project_id="project-nexus",
                project_name="Nexus",
                title="Deploy command center",
                status=WorkStatus.blocked.value,
                priority=Priority.medium.value,
                estimate_minutes=90,
                time_spent_minutes=20,
                due_date=datetime(2026, 7, 24, 12, tzinfo=UTC),
                dependency_titles=("Approve recovery drill",),
            ),
            ExecutionTask(
                id="done",
                project_id="project-nexus",
                project_name="Nexus",
                title="Finish tenant isolation",
                status=WorkStatus.done.value,
                priority=Priority.critical.value,
                estimate_minutes=60,
                time_spent_minutes=60,
                due_date=None,
            ),
        ],
        now=now,
    )

    assert [action.task_id for action in intelligence.next_actions] == ["overdue", "blocked"]
    assert intelligence.next_actions[1].action_type == "unblock"
    assert intelligence.next_actions[1].dependency_count == 1
    assert "Approve recovery drill" in intelligence.next_actions[1].reason
    assert intelligence.forecast.status == "watch"
    assert intelligence.forecast.overdue_tasks == 1
    assert intelligence.forecast.blocked_tasks == 1
    assert intelligence.forecast.remaining_minutes == 160
    assert {signal.key for signal in intelligence.risk_signals} == {
        "overdue_tasks",
        "blocked_paths",
        "project_deadline",
    }


def test_execution_intelligence_has_an_honest_empty_state() -> None:
    intelligence = build_execution_intelligence([], [], now=datetime(2026, 7, 20, tzinfo=UTC))

    assert intelligence.provider == "nexus_local_heuristic_v1"
    assert intelligence.next_actions == []
    assert intelligence.risk_signals == []
    assert intelligence.forecast.status == "empty"
    assert intelligence.forecast.schedule_confidence == 0
    assert "Create a project" in intelligence.forecast.summary
