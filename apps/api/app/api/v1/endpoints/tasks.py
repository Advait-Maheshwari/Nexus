from fastapi import APIRouter, Response, status

from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services.local_store import local_store

router = APIRouter()


@router.get("/projects/{project_id}/tasks", response_model=list[TaskRead])
async def list_tasks(project_id: str) -> list[TaskRead]:
    return local_store.list_tasks(project_id)


@router.post(
    "/projects/{project_id}/tasks",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_task(project_id: str, task: TaskCreate) -> TaskRead:
    return local_store.create_task(project_id, task)


@router.patch("/tasks/{task_id}", response_model=TaskRead)
async def update_task(task_id: str, task: TaskUpdate) -> TaskRead:
    return local_store.update_task(task_id, task)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str) -> Response:
    local_store.delete_task(task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

