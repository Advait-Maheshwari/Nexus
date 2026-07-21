from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthContext
from app.models.enums import ActivityAction
from app.models.project import Project
from app.models.project_blueprint import ProjectBlueprint
from app.models.task import Task
from app.models.user import User
from app.schemas.configuration import (
    ProjectBlueprintRead,
    ProjectBlueprintWrite,
    UserPreferencesRead,
    UserPreferencesWrite,
)
from app.services.audit import record_activity
from app.services.configuration_defaults import default_blueprint


class DatabaseConfiguration:
    async def get_blueprint(
        self,
        session: AsyncSession,
        auth: AuthContext,
        project_id: str,
    ) -> ProjectBlueprintRead:
        project = await self._project(session, auth, project_id)
        blueprint = await session.scalar(
            select(ProjectBlueprint).where(
                ProjectBlueprint.project_id == project_id,
                ProjectBlueprint.workspace_id == auth.workspace_id,
            )
        )
        if blueprint is None:
            defaults = default_blueprint(project.name)
            return ProjectBlueprintRead(
                **defaults.model_dump(),
                project_id=project_id,
                workspace_id=auth.workspace_id,
                updated_at=project.updated_at,
            )
        return self._blueprint_read(blueprint)

    async def update_blueprint(
        self,
        session: AsyncSession,
        auth: AuthContext,
        project_id: str,
        data: ProjectBlueprintWrite,
    ) -> ProjectBlueprintRead:
        await self._project(session, auth, project_id)
        task_ids = {task_id for team in data.teams for task_id in team.task_ids}
        if task_ids:
            valid_ids = set(
                await session.scalars(
                    select(Task.id).where(
                        Task.id.in_(task_ids),
                        Task.project_id == project_id,
                        Task.workspace_id == auth.workspace_id,
                    )
                )
            )
            if valid_ids != task_ids:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_CONTENT,
                    "Every team assignment must reference a task in this project",
                )

        blueprint = await session.scalar(
            select(ProjectBlueprint).where(
                ProjectBlueprint.project_id == project_id,
                ProjectBlueprint.workspace_id == auth.workspace_id,
            )
        )
        payload = data.model_dump(mode="json", exclude={"version"})
        if blueprint is None:
            if data.version != 0:
                raise HTTPException(status.HTTP_409_CONFLICT, "Blueprint version conflict")
            blueprint = ProjectBlueprint(
                workspace_id=auth.workspace_id,
                project_id=project_id,
                **payload,
            )
            session.add(blueprint)
        else:
            if data.version != blueprint.version:
                raise HTTPException(status.HTTP_409_CONFLICT, "Blueprint version conflict")
            for field, value in payload.items():
                setattr(blueprint, field, value)
            blueprint.version += 1
        await session.flush()
        record_activity(
            session,
            auth,
            project_id=project_id,
            action=ActivityAction.updated,
            entity_type="project_blueprint",
            entity_id=blueprint.id,
            message="Updated project execution blueprint",
        )
        await session.commit()
        await session.refresh(blueprint)
        return self._blueprint_read(blueprint)

    async def get_preferences(
        self,
        session: AsyncSession,
        auth: AuthContext,
    ) -> UserPreferencesRead:
        return self._preferences_read(await self._user(session, auth))

    async def update_preferences(
        self,
        session: AsyncSession,
        auth: AuthContext,
        data: UserPreferencesWrite,
    ) -> UserPreferencesRead:
        user = await self._user(session, auth)
        for field, value in data.model_dump().items():
            setattr(user, field, value)
        await session.commit()
        await session.refresh(user)
        return self._preferences_read(user)

    async def _project(
        self,
        session: AsyncSession,
        auth: AuthContext,
        project_id: str,
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

    async def _user(self, session: AsyncSession, auth: AuthContext) -> User:
        user = await session.scalar(
            select(User).where(User.id == auth.user_id, User.is_active.is_(True))
        )
        if user is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
        return user

    @staticmethod
    def _blueprint_read(blueprint: ProjectBlueprint) -> ProjectBlueprintRead:
        return ProjectBlueprintRead(
            project_id=blueprint.project_id,
            workspace_id=blueprint.workspace_id,
            vision=blueprint.vision,
            definition_of_done=blueprint.definition_of_done,
            strategy=blueprint.strategy,
            constraints=blueprint.constraints,
            goals=blueprint.goals,
            steps=blueprint.steps,
            teams=blueprint.teams,
            version=blueprint.version,
            updated_at=blueprint.updated_at,
        )

    @staticmethod
    def _preferences_read(user: User) -> UserPreferencesRead:
        return UserPreferencesRead(
            reduced_motion=user.reduced_motion,
            compact_interface=user.compact_interface,
            auto_briefing=user.auto_briefing,
            updated_at=user.updated_at,
        )


database_configuration = DatabaseConfiguration()
