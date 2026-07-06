from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthContext
from app.models.feature import Feature
from app.models.enums import ActivityAction
from app.models.project import Project
from app.models.task import Task, TaskDependency
from app.schemas.feature import FeatureCreate, FeatureRead, FeatureUpdate
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services.audit import record_activity


class DatabaseWorkspace:
    async def list_projects(
        self, session: AsyncSession, auth: AuthContext
    ) -> list[ProjectRead]:
        projects = (
            await session.scalars(
                select(Project)
                .where(Project.workspace_id == auth.workspace_id, Project.archived_at.is_(None))
                .order_by(Project.updated_at.desc())
            )
        ).all()
        return [await self._project_read(session, project) for project in projects]

    async def create_project(
        self, session: AsyncSession, auth: AuthContext, data: ProjectCreate
    ) -> ProjectRead:
        project = Project(
            workspace_id=auth.workspace_id,
            owner_id=auth.user_id,
            **data.model_dump(),
        )
        session.add(project)
        await session.flush()
        record_activity(
            session,
            auth,
            project_id=project.id,
            action=ActivityAction.created,
            entity_type="project",
            entity_id=project.id,
            message=f"Created project {project.name}",
        )
        await session.commit()
        await session.refresh(project)
        return await self._project_read(session, project)

    async def get_project(
        self, session: AsyncSession, auth: AuthContext, project_id: str
    ) -> ProjectRead:
        return await self._project_read(session, await self._project(session, auth, project_id))

    async def update_project(
        self,
        session: AsyncSession,
        auth: AuthContext,
        project_id: str,
        data: ProjectUpdate,
    ) -> ProjectRead:
        project = await self._project(session, auth, project_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(project, field, value)
        record_activity(
            session,
            auth,
            project_id=project.id,
            action=ActivityAction.updated,
            entity_type="project",
            entity_id=project.id,
            message=f"Updated project {project.name}",
            payload={"fields": list(data.model_dump(exclude_unset=True))},
        )
        await session.commit()
        await session.refresh(project)
        return await self._project_read(session, project)

    async def delete_project(
        self, session: AsyncSession, auth: AuthContext, project_id: str
    ) -> None:
        project = await self._project(session, auth, project_id)
        project.archived_at = datetime.now(UTC)
        record_activity(
            session,
            auth,
            project_id=project.id,
            action=ActivityAction.archived,
            entity_type="project",
            entity_id=project.id,
            message=f"Archived project {project.name}",
        )
        await session.commit()

    async def list_features(
        self, session: AsyncSession, auth: AuthContext, project_id: str
    ) -> list[FeatureRead]:
        await self._project(session, auth, project_id)
        features = (
            await session.scalars(
                select(Feature)
                .where(
                    Feature.project_id == project_id,
                    Feature.workspace_id == auth.workspace_id,
                )
                .order_by(Feature.sort_order, Feature.created_at)
            )
        ).all()
        return [await self._feature_read(session, feature) for feature in features]

    async def create_feature(
        self,
        session: AsyncSession,
        auth: AuthContext,
        project_id: str,
        data: FeatureCreate,
    ) -> FeatureRead:
        await self._project(session, auth, project_id)
        feature = Feature(
            workspace_id=auth.workspace_id,
            project_id=project_id,
            **data.model_dump(),
        )
        session.add(feature)
        await session.flush()
        record_activity(
            session,
            auth,
            project_id=project_id,
            action=ActivityAction.created,
            entity_type="feature",
            entity_id=feature.id,
            message=f"Created feature {feature.title}",
        )
        await session.commit()
        await session.refresh(feature)
        return await self._feature_read(session, feature)

    async def update_feature(
        self,
        session: AsyncSession,
        auth: AuthContext,
        feature_id: str,
        data: FeatureUpdate,
    ) -> FeatureRead:
        feature = await self._feature(session, auth, feature_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(feature, field, value)
        if data.status is not None:
            feature.completed_at = datetime.now(UTC) if data.status.value == "done" else None
        record_activity(
            session,
            auth,
            project_id=feature.project_id,
            action=(
                ActivityAction.completed
                if data.status is not None and data.status.value == "done"
                else ActivityAction.updated
            ),
            entity_type="feature",
            entity_id=feature.id,
            message=f"Updated feature {feature.title}",
        )
        await session.commit()
        await session.refresh(feature)
        return await self._feature_read(session, feature)

    async def delete_feature(
        self, session: AsyncSession, auth: AuthContext, feature_id: str
    ) -> None:
        feature = await self._feature(session, auth, feature_id)
        task_count = await session.scalar(
            select(func.count(Task.id)).where(
                Task.feature_id == feature.id,
                Task.workspace_id == auth.workspace_id,
            )
        )
        if task_count:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Move or delete this feature's tasks first",
            )
        record_activity(
            session,
            auth,
            project_id=feature.project_id,
            action=ActivityAction.archived,
            entity_type="feature",
            entity_id=feature.id,
            message=f"Deleted feature {feature.title}",
        )
        await session.delete(feature)
        await session.commit()

    async def list_tasks(
        self, session: AsyncSession, auth: AuthContext, project_id: str
    ) -> list[TaskRead]:
        await self._project(session, auth, project_id)
        tasks = (
            await session.scalars(
                select(Task)
                .where(Task.project_id == project_id, Task.workspace_id == auth.workspace_id)
                .order_by(Task.created_at)
            )
        ).all()
        return [self._task_read(task) for task in tasks]

    async def create_task(
        self,
        session: AsyncSession,
        auth: AuthContext,
        project_id: str,
        data: TaskCreate,
    ) -> TaskRead:
        await self._project(session, auth, project_id)
        if data.feature_id:
            feature = await self._feature(session, auth, data.feature_id)
            if feature.project_id != project_id:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Feature mismatch")
        if data.parent_task_id:
            parent = await self._task(session, auth, data.parent_task_id)
            if parent.project_id != project_id:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Parent task mismatch")
        task = Task(
            workspace_id=auth.workspace_id,
            project_id=project_id,
            **data.model_dump(),
        )
        session.add(task)
        await session.flush()
        record_activity(
            session,
            auth,
            project_id=project_id,
            action=ActivityAction.created,
            entity_type="task",
            entity_id=task.id,
            message=f"Created task {task.title}",
        )
        await session.commit()
        await session.refresh(task)
        return self._task_read(task)

    async def update_task(
        self,
        session: AsyncSession,
        auth: AuthContext,
        task_id: str,
        data: TaskUpdate,
    ) -> TaskRead:
        task = await self._task(session, auth, task_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(task, field, value)
        if data.status is not None:
            task.completed_at = datetime.now(UTC) if data.status.value == "done" else None
        record_activity(
            session,
            auth,
            project_id=task.project_id,
            action=(
                ActivityAction.completed
                if data.status is not None and data.status.value == "done"
                else ActivityAction.updated
            ),
            entity_type="task",
            entity_id=task.id,
            message=f"Updated task {task.title}",
        )
        await session.commit()
        await session.refresh(task)
        return self._task_read(task)

    async def delete_task(
        self, session: AsyncSession, auth: AuthContext, task_id: str
    ) -> None:
        task = await self._task(session, auth, task_id)
        await session.execute(
            delete(TaskDependency).where(
                (TaskDependency.task_id == task.id)
                | (TaskDependency.depends_on_task_id == task.id)
            )
        )
        record_activity(
            session,
            auth,
            project_id=task.project_id,
            action=ActivityAction.archived,
            entity_type="task",
            entity_id=task.id,
            message=f"Deleted task {task.title}",
        )
        await session.delete(task)
        await session.commit()

    async def _project(
        self, session: AsyncSession, auth: AuthContext, project_id: str
    ) -> Project:
        project = await session.scalar(
            select(Project).where(
                Project.id == project_id,
                Project.workspace_id == auth.workspace_id,
                Project.archived_at.is_(None),
            )
        )
        if project is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
        return project

    async def _feature(
        self, session: AsyncSession, auth: AuthContext, feature_id: str
    ) -> Feature:
        feature = await session.scalar(
            select(Feature).where(
                Feature.id == feature_id,
                Feature.workspace_id == auth.workspace_id,
            )
        )
        if feature is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Feature not found")
        return feature

    async def _task(self, session: AsyncSession, auth: AuthContext, task_id: str) -> Task:
        task = await session.scalar(
            select(Task).where(Task.id == task_id, Task.workspace_id == auth.workspace_id)
        )
        if task is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
        return task

    async def _project_read(self, session: AsyncSession, project: Project) -> ProjectRead:
        total, done = (
            await session.execute(
                select(
                    func.count(Task.id),
                    func.count(Task.id).filter(Task.status == "done"),
                ).where(
                    Task.project_id == project.id,
                    Task.workspace_id == project.workspace_id,
                )
            )
        ).one()
        progress = round((done / total) * 100, 1) if total else 0
        return ProjectRead(
            id=project.id,
            workspace_id=project.workspace_id,
            name=project.name,
            codename=project.codename,
            description=project.description,
            status=project.status,
            priority=project.priority,
            health_score=project.health_score,
            progress=progress,
            deadline=project.deadline,
        )

    async def _feature_read(self, session: AsyncSession, feature: Feature) -> FeatureRead:
        total, done, blocked = (
            await session.execute(
                select(
                    func.count(Task.id),
                    func.count(Task.id).filter(Task.status == "done"),
                    func.count(Task.id).filter(Task.status == "blocked"),
                ).where(
                    Task.feature_id == feature.id,
                    Task.workspace_id == feature.workspace_id,
                )
            )
        ).one()
        progress = round((done / total) * 100, 1) if total else 0
        return FeatureRead(
            id=feature.id,
            workspace_id=feature.workspace_id,
            project_id=feature.project_id,
            title=feature.title,
            description=feature.description,
            status=feature.status,
            priority=feature.priority,
            progress=progress,
            deadline=feature.deadline,
            task_count=total,
            blocked_task_count=blocked,
        )

    @staticmethod
    def _task_read(task: Task) -> TaskRead:
        return TaskRead(
            id=task.id,
            workspace_id=task.workspace_id,
            project_id=task.project_id,
            feature_id=task.feature_id,
            parent_task_id=task.parent_task_id,
            title=task.title,
            description=task.description,
            status=task.status,
            priority=task.priority,
            estimate_minutes=task.estimate_minutes,
            time_spent_minutes=task.time_spent_minutes,
            due_date=task.due_date,
            blocked_reason=task.blocked_reason,
        )


database_workspace = DatabaseWorkspace()
