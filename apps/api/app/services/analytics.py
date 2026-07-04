from app.domain.progress import TaskSignal, calculate_completion, calculate_health_score, classify_health
from app.models.enums import Priority, WorkStatus
from app.schemas.analytics import AIRecommendation, MetricCard, MissionControlSummary
from app.schemas.project import ProjectSummary


def build_seed_mission_control() -> MissionControlSummary:
    projects = [
        ProjectSummary(
            id="project-nexus",
            name="Nexus",
            codename="ORION",
            status=WorkStatus.in_progress,
            health=classify_health(88),
            health_score=88,
            progress=34,
            priority=Priority.critical,
            deadline="2026-08-15",
            time_spent_minutes=1260,
            velocity=7.4,
            feature_count=8,
            task_count=42,
            blocked_task_count=2,
        ),
        ProjectSummary(
            id="project-ai-lab",
            name="AI Research Lab",
            codename="LYRA",
            status=WorkStatus.ready,
            health=classify_health(74),
            health_score=74,
            progress=58,
            priority=Priority.high,
            deadline="2026-07-28",
            time_spent_minutes=860,
            velocity=4.1,
            feature_count=5,
            task_count=29,
            blocked_task_count=1,
        ),
        ProjectSummary(
            id="project-startup",
            name="Startup Concepts",
            codename="NOVA",
            status=WorkStatus.in_progress,
            health=classify_health(61),
            health_score=61,
            progress=21,
            priority=Priority.medium,
            deadline=None,
            time_spent_minutes=430,
            velocity=2.8,
            feature_count=6,
            task_count=35,
            blocked_task_count=4,
        ),
    ]

    active_tasks = [
        TaskSignal(status=WorkStatus.done),
        TaskSignal(status=WorkStatus.in_progress),
        TaskSignal(status=WorkStatus.blocked),
        TaskSignal(status=WorkStatus.ready),
    ]
    completion = calculate_completion(active_tasks)
    health = calculate_health_score(active_tasks)

    return MissionControlSummary(
        metrics=[
            MetricCard(label="Overall Progress", value=f"{completion:.0f}%", delta="+12% this week", tone="cyan"),
            MetricCard(label="Portfolio Health", value=f"{health:.0f}", delta="stable orbit", tone="green"),
            MetricCard(label="Focus Hours", value="21h", delta="+4h vs last week", tone="gold"),
            MetricCard(label="Blocked Tasks", value="7", delta="2 critical", tone="red"),
        ],
        projects=projects,
        today_mission=[
            "Ship the Nexus repo scaffold.",
            "Lock the core data model for project-feature-task progress.",
            "Sketch AI daily briefing prompts.",
        ],
        ai_recommendations=[
            AIRecommendation(
                title="Next best move",
                body="Prioritize the task creation flow before adding more visual modes.",
                confidence=0.89,
                action_label="Open task spine",
            ),
            AIRecommendation(
                title="Risk detected",
                body="Startup Concepts has rising blockers and no deadline. Set a milestone this week.",
                confidence=0.77,
                action_label="Create milestone",
            ),
        ],
        activity=[
            "Nexus architecture initialized.",
            "Galaxy View mapped projects to stars.",
            "Health scoring formula drafted.",
            "AI provider boundary created.",
        ],
    )

