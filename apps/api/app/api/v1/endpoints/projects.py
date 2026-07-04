from fastapi import APIRouter, Response, status

from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.services.local_store import local_store

router = APIRouter()


@router.get("", response_model=list[ProjectRead])
async def list_projects() -> list[ProjectRead]:
    return local_store.list_projects()


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(project: ProjectCreate) -> ProjectRead:
    return local_store.create_project(project)


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(project_id: str) -> ProjectRead:
    return local_store.get_project(project_id)


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(project_id: str, project: ProjectUpdate) -> ProjectRead:
    return local_store.update_project(project_id, project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str) -> Response:
    local_store.delete_project(project_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
