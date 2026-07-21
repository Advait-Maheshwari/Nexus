from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security import AuthContext, require_auth_context, require_workspace_editor
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.services.database_workspace import database_workspace
from app.services.local_store import local_store

router = APIRouter()


@router.get("", response_model=list[ProjectRead])
async def list_projects(
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> list[ProjectRead]:
    if settings.auth_backend == "database":
        return await database_workspace.list_projects(session, auth)
    return local_store.list_projects()


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: ProjectCreate,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> ProjectRead:
    if settings.auth_backend == "database":
        require_workspace_editor(auth)
        return await database_workspace.create_project(session, auth, project)
    return local_store.create_project(project)


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> ProjectRead:
    if settings.auth_backend == "database":
        return await database_workspace.get_project(session, auth, project_id)
    return local_store.get_project(project_id)


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: str,
    project: ProjectUpdate,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> ProjectRead:
    if settings.auth_backend == "database":
        require_workspace_editor(auth)
        return await database_workspace.update_project(session, auth, project_id, project)
    return local_store.update_project(project_id, project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> Response:
    if settings.auth_backend == "database":
        require_workspace_editor(auth)
        await database_workspace.delete_project(session, auth, project_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    local_store.delete_project(project_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
