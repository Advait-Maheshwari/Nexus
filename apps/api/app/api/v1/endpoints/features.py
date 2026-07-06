from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security import AuthContext, require_auth_context
from app.schemas.feature import FeatureCreate, FeatureRead, FeatureUpdate
from app.services.database_workspace import database_workspace
from app.services.local_store import local_store

router = APIRouter()


@router.get("/projects/{project_id}/features", response_model=list[FeatureRead])
async def list_features(
    project_id: str,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> list[FeatureRead]:
    if settings.auth_backend == "database":
        return await database_workspace.list_features(session, auth, project_id)
    return local_store.list_features(project_id)


@router.post(
    "/projects/{project_id}/features",
    response_model=FeatureRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_feature(
    project_id: str,
    feature: FeatureCreate,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> FeatureRead:
    if settings.auth_backend == "database":
        return await database_workspace.create_feature(session, auth, project_id, feature)
    return local_store.create_feature(project_id, feature)


@router.patch("/features/{feature_id}", response_model=FeatureRead)
async def update_feature(
    feature_id: str,
    feature: FeatureUpdate,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> FeatureRead:
    if settings.auth_backend == "database":
        return await database_workspace.update_feature(session, auth, feature_id, feature)
    return local_store.update_feature(feature_id, feature)


@router.delete("/features/{feature_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feature(
    feature_id: str,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> Response:
    if settings.auth_backend == "database":
        await database_workspace.delete_feature(session, auth, feature_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    local_store.delete_feature(feature_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
