from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security import AuthContext, require_auth_context, require_workspace_editor
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services.database_workspace import database_workspace
from app.services.local_store import local_store

router = APIRouter()


@router.get("/projects/{project_id}/tasks", response_model=list[TaskRead])
async def list_tasks(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> list[TaskRead]:
    if settings.auth_backend == "database":
        return await database_workspace.list_tasks(session, auth, project_id)
    return local_store.list_tasks(project_id)


@router.post(
    "/projects/{project_id}/tasks",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_task(
    project_id: str,
    task: TaskCreate,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> TaskRead:
    if settings.auth_backend == "database":
        require_workspace_editor(auth)
        return await database_workspace.create_task(session, auth, project_id, task)
    return local_store.create_task(project_id, task)


@router.patch("/tasks/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: str,
    task: TaskUpdate,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> TaskRead:
    if settings.auth_backend == "database":
        require_workspace_editor(auth)
        return await database_workspace.update_task(session, auth, task_id, task)
    return local_store.update_task(task_id, task)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> Response:
    if settings.auth_backend == "database":
        require_workspace_editor(auth)
        await database_workspace.delete_task(session, auth, task_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    local_store.delete_task(task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
