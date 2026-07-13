from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthContext
from app.domain.progress import TaskSignal, calculate_completion, calculate_health_score, classify_health
from app.models.activity_log import ActivityLog
from app.models.enums import Priority, WorkStatus
from app.models.feature import Feature
from app.models.project import Project
from app.models.task import Task
from app.schemas.analytics import AIRecommendation, MetricCard, MissionControlSummary
from app.schemas.project import ProjectSummary


async def build_database_mission_control(
    session: AsyncSession, auth: AuthContext
) -> MissionControlSummary:
    projects = (
        await session.scalars(
            select(Project)
            .where(Project.workspace_id == auth.workspace_id, Project.archived_at.is_(None))
            .order_by(Project.updated_at.desc())
        )
    ).all()
    summaries: list[ProjectSummary] = []
    total_tasks = 0
    done_tasks = 0
    blocked_tasks = 0
    total_minutes = 0

    for project in projects:
        task_total, task_done, task_blocked, spent = (
            await session.execute(
                select(
                    func.count(Task.id),
                    func.count(Task.id).filter(Task.status == WorkStatus.done.value),
                    func.count(Task.id).filter(Task.status == WorkStatus.blocked.value),
                    func.coalesce(func.sum(Task.time_spent_minutes), 0),
                ).where(
                    Task.workspace_id == auth.workspace_id,
                    Task.project_id == project.id,
                )
            )
        ).one()
        feature_count = await session.scalar(
            select(func.count(Feature.id)).where(
                Feature.workspace_id == auth.workspace_id,
                Feature.project_id == project.id,
            )
        )
        recent_done = await session.scalar(
            select(func.count(Task.id)).where(
                Task.workspace_id == auth.workspace_id,
                Task.project_id == project.id,
                Task.status == WorkStatus.done.value,
                Task.completed_at >= datetime.now(UTC) - timedelta(days=7),
            )
        )
        progress = round((task_done / task_total) * 100, 1) if task_total else 0
        total_tasks += task_total
        done_tasks += task_done
        blocked_tasks += task_blocked
        total_minutes += spent
        summaries.append(
            ProjectSummary(
                id=project.id,
                name=project.name,
                codename=project.codename,
                status=project.status,
                health=classify_health(project.health_score),
                health_score=project.health_score,
                progress=progress,
                priority=project.priority,
                deadline=project.deadline.isoformat() if project.deadline else None,
                time_spent_minutes=spent,
                velocity=float(recent_done or 0),
                feature_count=feature_count or 0,
                task_count=task_total,
                blocked_task_count=task_blocked,
            )
        )

    open_tasks = (
        await session.scalars(
            select(Task)
            .where(
                Task.workspace_id == auth.workspace_id,
                Task.status != WorkStatus.done.value,
            )
            .order_by(Task.due_date.asc().nullslast(), Task.updated_at.desc())
            .limit(12)
        )
    ).all()
    open_tasks.sort(
        key=lambda task: (
            task.status != WorkStatus.blocked,
            _priority_rank(task.priority),
            task.due_date is None,
            task.due_date or datetime.max.replace(tzinfo=UTC),
        )
    )
    today_mission = [task.title for task in open_tasks[:3]]
    if not today_mission:
        today_mission = [
            "Create the first project and define its outcome.",
            "Add a feature that represents the first deliverable.",
            "Break the deliverable into a task you can finish today.",
        ]

    recommendations = _database_recommendations(summaries, blocked_tasks, total_tasks)
    activity = list(
        await session.scalars(
            select(ActivityLog.message)
            .where(ActivityLog.workspace_id == auth.workspace_id)
            .order_by(ActivityLog.created_at.desc())
            .limit(6)
        )
    )
    portfolio_progress = round((done_tasks / total_tasks) * 100) if total_tasks else 0
    portfolio_health = (
        round(sum(project.health_score for project in summaries) / len(summaries))
        if summaries
        else 100
    )

    return MissionControlSummary(
        metrics=[
            MetricCard(
                label="Overall Progress",
                value=f"{portfolio_progress}%",
                delta=f"{done_tasks} of {total_tasks} tasks complete",
                tone="cyan",
            ),
            MetricCard(
                label="Portfolio Health",
                value=str(portfolio_health),
                delta=f"{len(summaries)} active projects",
                tone="green",
            ),
            MetricCard(
                label="Focus Hours",
                value=f"{total_minutes / 60:.1f}h",
                delta="recorded across this workspace",
                tone="gold",
            ),
            MetricCard(
                label="Blocked Tasks",
                value=str(blocked_tasks),
                delta="requires attention" if blocked_tasks else "clear path",
                tone="red" if blocked_tasks else "green",
            ),
        ],
        projects=summaries,
        today_mission=today_mission,
        ai_recommendations=recommendations,
        activity=activity,
    )


def _database_recommendations(
    projects: list[ProjectSummary], blocked_tasks: int, total_tasks: int
) -> list[AIRecommendation]:
    recommendations: list[AIRecommendation] = []
    if blocked_tasks:
        recommendations.append(
            AIRecommendation(
                title="Clear the blocked path",
                body=f"Resolve one of the {blocked_tasks} blocked tasks before starting more work.",
                confidence=0.93,
                action_label="Review blockers",
            )
        )
    at_risk = min(projects, key=lambda item: item.health_score, default=None)
    if at_risk and at_risk.health_score < 75:
        recommendations.append(
            AIRecommendation(
                title="Protect project health",
                body=f"{at_risk.name} has the lowest health score at {at_risk.health_score:.0f}.",
                confidence=0.86,
                action_label="Inspect project",
            )
        )
    if total_tasks == 0:
        recommendations.append(
            AIRecommendation(
                title="Define the next move",
                body="Create a small, finishable task so Nexus can calculate progress and risk.",
                confidence=0.98,
                action_label="Create task",
            )
        )
    if not recommendations:
        recommendations.append(
            AIRecommendation(
                title="Keep momentum",
                body="Finish the highest-priority open task before expanding the active scope.",
                confidence=0.82,
                action_label="Open mission",
            )
        )
    return recommendations[:3]


def _priority_rank(priority: Priority | str) -> int:
    value = priority.value if isinstance(priority, Priority) else priority
    return {
        Priority.critical.value: 0,
        Priority.high.value: 1,
        Priority.medium.value: 2,
        Priority.low.value: 3,
    }.get(value, 4)


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
