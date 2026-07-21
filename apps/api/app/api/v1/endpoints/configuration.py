from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security import AuthContext, require_auth_context, require_workspace_editor
from app.schemas.configuration import (
    ProjectBlueprintRead,
    ProjectBlueprintWrite,
    UserPreferencesRead,
    UserPreferencesWrite,
)
from app.services.database_configuration import database_configuration
from app.services.local_configuration import local_configuration

router = APIRouter()


@router.get("/projects/{project_id}/blueprint", response_model=ProjectBlueprintRead)
async def get_project_blueprint(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> ProjectBlueprintRead:
    if settings.auth_backend == "database":
        return await database_configuration.get_blueprint(session, auth, project_id)
    return local_configuration.get_blueprint(auth, project_id)


@router.put("/projects/{project_id}/blueprint", response_model=ProjectBlueprintRead)
async def update_project_blueprint(
    project_id: str,
    data: ProjectBlueprintWrite,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> ProjectBlueprintRead:
    require_workspace_editor(auth)
    if settings.auth_backend == "database":
        return await database_configuration.update_blueprint(session, auth, project_id, data)
    return local_configuration.update_blueprint(auth, project_id, data)


@router.get("/preferences", response_model=UserPreferencesRead)
async def get_preferences(
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> UserPreferencesRead:
    if settings.auth_backend == "database":
        return await database_configuration.get_preferences(session, auth)
    return local_configuration.get_preferences(auth)


@router.put("/preferences", response_model=UserPreferencesRead)
async def update_preferences(
    data: UserPreferencesWrite,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> UserPreferencesRead:
    if settings.auth_backend == "database":
        return await database_configuration.update_preferences(session, auth, data)
    return local_configuration.update_preferences(auth, data)
