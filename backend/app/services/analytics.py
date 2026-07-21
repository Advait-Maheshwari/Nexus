from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthContext
from app.domain.progress import classify_health
from app.models.activity_log import ActivityLog
from app.models.enums import Priority, WorkStatus
from app.models.feature import Feature
from app.models.project import Project
from app.models.task import Task, TaskDependency
from app.schemas.analytics import AIRecommendation, MetricCard, MissionControlSummary
from app.schemas.project import ProjectSummary
from app.services.execution_intelligence import ExecutionTask, build_execution_intelligence
from app.services.local_store import LocalStore


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

    workspace_tasks = (
        await session.scalars(
            select(Task).where(Task.workspace_id == auth.workspace_id)
        )
    ).all()
    task_by_id = {task.id: task for task in workspace_tasks}
    task_ids = list(task_by_id)
    dependencies = (
        (
            await session.scalars(
                select(TaskDependency).where(
                    TaskDependency.task_id.in_(task_ids),
                    TaskDependency.depends_on_task_id.in_(task_ids),
                )
            )
        ).all()
        if task_ids
        else []
    )
    dependency_titles: dict[str, list[str]] = {}
    for dependency in dependencies:
        prerequisite = task_by_id.get(dependency.depends_on_task_id)
        if prerequisite and prerequisite.status not in {
            WorkStatus.done.value,
            WorkStatus.archived.value,
        }:
            dependency_titles.setdefault(dependency.task_id, []).append(prerequisite.title)

    project_name_by_id = {project.id: project.name for project in projects}
    execution_intelligence = build_execution_intelligence(
        summaries,
        [
            ExecutionTask(
                id=task.id,
                project_id=task.project_id,
                project_name=project_name_by_id.get(task.project_id, "Unknown project"),
                title=task.title,
                status=_enum_value(task.status),
                priority=_enum_value(task.priority),
                estimate_minutes=task.estimate_minutes,
                time_spent_minutes=task.time_spent_minutes,
                due_date=task.due_date,
                blocked_reason=task.blocked_reason,
                dependency_titles=tuple(sorted(dependency_titles.get(task.id, []))),
            )
            for task in workspace_tasks
        ],
    )
    open_tasks = [
        task
        for task in workspace_tasks
        if task.status not in {WorkStatus.done.value, WorkStatus.archived.value}
    ]
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
        execution_intelligence=execution_intelligence,
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


def _enum_value(value: Priority | WorkStatus | str) -> str:
    return value.value if isinstance(value, (Priority, WorkStatus)) else value


def _priority_rank(priority: Priority | str) -> int:
    value = priority.value if isinstance(priority, Priority) else priority
    return {
        Priority.critical.value: 0,
        Priority.high.value: 1,
        Priority.medium.value: 2,
        Priority.low.value: 3,
    }.get(value, 4)


def build_local_mission_control(store: LocalStore) -> MissionControlSummary:
    project_records = store.list_projects()
    summaries: list[ProjectSummary] = []
    open_tasks = []
    all_tasks = []
    total_tasks = 0
    done_tasks = 0
    blocked_tasks = 0
    total_minutes = 0

    for project in project_records:
        tasks = store.list_tasks(project.id)
        features = store.list_features(project.id)
        task_done = sum(task.status == WorkStatus.done for task in tasks)
        task_blocked = sum(task.status == WorkStatus.blocked for task in tasks)
        spent = sum(task.time_spent_minutes for task in tasks)
        all_tasks.extend(tasks)
        total_tasks += len(tasks)
        done_tasks += task_done
        blocked_tasks += task_blocked
        total_minutes += spent
        open_tasks.extend(task for task in tasks if task.status != WorkStatus.done)
        summaries.append(
            ProjectSummary(
                id=project.id,
                name=project.name,
                codename=project.codename,
                status=project.status,
                health=classify_health(project.health_score),
                health_score=project.health_score,
                progress=project.progress,
                priority=project.priority,
                deadline=project.deadline.isoformat() if project.deadline else None,
                time_spent_minutes=spent,
                velocity=0,
                feature_count=len(features),
                task_count=len(tasks),
                blocked_task_count=task_blocked,
            )
        )

    open_tasks.sort(
        key=lambda task: (
            task.status != WorkStatus.blocked,
            _priority_rank(task.priority),
            task.due_date is None,
            task.due_date or datetime.max,
        )
    )
    today_mission = [task.title for task in open_tasks[:3]] or [
        "Create your first project and define its outcome.",
        "Add the first feature or deliverable.",
        "Create one task you can finish today.",
    ]
    portfolio_progress = round((done_tasks / total_tasks) * 100) if total_tasks else 0
    portfolio_health = (
        round(sum(project.health_score for project in summaries) / len(summaries))
        if summaries
        else 100
    )
    project_name_by_id = {project.id: project.name for project in project_records}
    execution_intelligence = build_execution_intelligence(
        summaries,
        [
            ExecutionTask(
                id=task.id,
                project_id=task.project_id,
                project_name=project_name_by_id.get(task.project_id, "Unknown project"),
                title=task.title,
                status=_enum_value(task.status),
                priority=_enum_value(task.priority),
                estimate_minutes=task.estimate_minutes,
                time_spent_minutes=task.time_spent_minutes,
                due_date=task.due_date,
                blocked_reason=task.blocked_reason,
            )
            for task in all_tasks
        ],
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
        ai_recommendations=_database_recommendations(summaries, blocked_tasks, total_tasks),
        activity=[],
        execution_intelligence=execution_intelligence,
    )
