from datetime import UTC, datetime, timedelta

from app.services.goal_health import calculate_goal_aware_health


def test_goal_aware_health_rewards_clear_goal_and_ownership() -> None:
    now = datetime(2026, 7, 30, tzinfo=UTC)
    blueprint = {
        "vision": "Ship Nexus as a secure project operating system for real work.",
        "definition_of_done": "Users can plan, execute, review, and recover projects securely.",
        "strategy": "Move one verified workflow at a time and keep every default path zero-cost.",
        "goals": [
            {"completed": True},
            {"completed": False},
        ],
        "steps": [
            {"status": "done", "priority": "critical"},
            {"status": "active", "priority": "high"},
        ],
        "teams": [
            {
                "task_ids": ["done"],
                "subteams": [{"task_ids": ["active"]}],
            }
        ],
    }

    score = calculate_goal_aware_health(
        base_health_score=72,
        progress=50,
        task_count=2,
        blocked_task_count=0,
        open_task_ids={"active"},
        deadline=now + timedelta(days=21),
        blueprint=blueprint,
        now=now,
    )

    assert score >= 70


def test_goal_aware_health_penalizes_progress_without_project_definition() -> None:
    now = datetime(2026, 7, 30, tzinfo=UTC)
    weak_blueprint = {
        "vision": "",
        "definition_of_done": "",
        "strategy": "",
        "goals": [{"completed": False}],
        "steps": [{"status": "pending", "priority": "critical"}],
        "teams": [],
    }

    score = calculate_goal_aware_health(
        base_health_score=90,
        progress=80,
        task_count=4,
        blocked_task_count=1,
        open_task_ids={"task-1", "task-2"},
        deadline=now - timedelta(days=1),
        blueprint=weak_blueprint,
        now=now,
    )

    assert score < 60
