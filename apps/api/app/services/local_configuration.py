from datetime import UTC, datetime

from fastapi import HTTPException, status

from app.core.security import AuthContext
from app.schemas.configuration import (
    ProjectBlueprintRead,
    ProjectBlueprintWrite,
    UserPreferencesRead,
    UserPreferencesWrite,
)
from app.services.configuration_defaults import default_blueprint
from app.services.local_store import local_store


class LocalConfiguration:
    def __init__(self) -> None:
        self.blueprints: dict[str, ProjectBlueprintRead] = {}
        self.preferences: dict[str, UserPreferencesRead] = {}

    def get_blueprint(self, auth: AuthContext, project_id: str) -> ProjectBlueprintRead:
        project = local_store.projects.get(project_id)
        if project is None or project.workspace_id != auth.workspace_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
        current = self.blueprints.get(project_id)
        return current or self._read(
            auth,
            project_id,
            default_blueprint(project.name),
            0,
        )

    def update_blueprint(
        self,
        auth: AuthContext,
        project_id: str,
        data: ProjectBlueprintWrite,
    ) -> ProjectBlueprintRead:
        project = local_store.projects.get(project_id)
        if project is None or project.workspace_id != auth.workspace_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
        task_ids = {task_id for team in data.teams for task_id in team.task_ids}
        valid_ids = {
            task.id
            for task in local_store.tasks.values()
            if task.id in task_ids
            and task.project_id == project_id
            and task.workspace_id == auth.workspace_id
        }
        if valid_ids != task_ids:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                "Every team assignment must reference a task in this project",
            )
        current = self.blueprints.get(project_id)
        expected_version = current.version if current else 0
        if data.version != expected_version:
            raise HTTPException(status.HTTP_409_CONFLICT, "Blueprint version conflict")
        version = expected_version + 1
        current = self._read(auth, project_id, data, version)
        self.blueprints[project_id] = current
        return current

    def get_preferences(self, auth: AuthContext) -> UserPreferencesRead:
        return self.preferences.setdefault(
            auth.user_id,
            UserPreferencesRead(updated_at=datetime.now(UTC)),
        )

    def update_preferences(
        self,
        auth: AuthContext,
        data: UserPreferencesWrite,
    ) -> UserPreferencesRead:
        current = UserPreferencesRead(
            **data.model_dump(),
            updated_at=datetime.now(UTC),
        )
        self.preferences[auth.user_id] = current
        return current

    @staticmethod
    def _read(
        auth: AuthContext,
        project_id: str,
        data: ProjectBlueprintWrite,
        version: int,
    ) -> ProjectBlueprintRead:
        return ProjectBlueprintRead(
            **data.model_dump(),
            project_id=project_id,
            workspace_id=auth.workspace_id,
            version=version,
            updated_at=datetime.now(UTC),
        )


local_configuration = LocalConfiguration()
