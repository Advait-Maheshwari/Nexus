from datetime import UTC, datetime

from app.models.enums import Priority, ProjectHealth, WorkStatus
from app.schemas.project import ProjectSummary
from app.services.execution_intelligence import ExecutionTask
from app.services.team_intelligence import build_team_intelligence


def _project() -> ProjectSummary:
    return ProjectSummary(
        id="project-nexus",
        name="Nexus",
        codename="NX",
        status=WorkStatus.in_progress,
        health=ProjectHealth.stable,
        health_score=82,
        progress=50,
        priority=Priority.high,
        time_spent_minutes=90,
        velocity=2,
        feature_count=2,
        task_count=3,
        blocked_task_count=1,
    )


def _task(
    task_id: str,
    title: str,
    status: WorkStatus,
    *,
    estimate_minutes: int = 60,
    time_spent_minutes: int = 0,
) -> ExecutionTask:
    return ExecutionTask(
        id=task_id,
        project_id="project-nexus",
        project_name="Nexus",
        title=title,
        status=status.value,
        priority=Priority.high.value,
        estimate_minutes=estimate_minutes,
        time_spent_minutes=time_spent_minutes,
        due_date=None,
    )


def test_team_intelligence_identifies_lagging_team_and_unowned_work() -> None:
    intelligence = build_team_intelligence(
        [_project()],
        [
            _task("done", "Secure authentication", WorkStatus.done, time_spent_minutes=60),
            _task("blocked", "Release backend", WorkStatus.blocked),
            _task("unowned", "Verify mobile", WorkStatus.ready, estimate_minutes=90),
        ],
        {
            "project-nexus": [
                {
                    "id": "platform",
                    "name": "Platform",
                    "lead": "Operations lead",
                    "responsibility": "Own secure releases",
                    "task_ids": ["done"],
                    "subteams": [
                        {
                            "id": "deploy",
                            "name": "Deploy",
                            "lead": "Release owner",
                            "responsibility": "Own production release blockers",
                            "task_ids": ["blocked"],
                        }
                    ],
                }
            ]
        },
        now=datetime(2026, 7, 24, tzinfo=UTC),
    )

    assert intelligence.total_teams == 1
    assert intelligence.lagging_teams == 1
    assert intelligence.unassigned_tasks == 1
    assert "need recovery" in intelligence.headline
    signal = intelligence.signals[0]
    assert signal.state == "lagging"
    assert signal.subteam_count == 1
    assert signal.completion_percent == 50
    assert signal.blocked_task_count == 1
    assert signal.assigned_task_titles == ["Secure authentication", "Release backend"]
    assert "Release backend" in signal.recovery_action
    assert "sub-team" in signal.recovery_action


def test_team_intelligence_has_honest_no_team_guidance() -> None:
    intelligence = build_team_intelligence(
        [_project()],
        [_task("ready", "Define first outcome", WorkStatus.ready)],
        {},
        now=datetime(2026, 7, 24, tzinfo=UTC),
    )

    assert intelligence.total_teams == 0
    assert intelligence.unassigned_tasks == 1
    assert intelligence.signals == []
    assert "need a team owner" in intelligence.headline
