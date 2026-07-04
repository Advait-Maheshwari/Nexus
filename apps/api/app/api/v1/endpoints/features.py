from fastapi import APIRouter, Response, status

from app.schemas.feature import FeatureCreate, FeatureRead, FeatureUpdate
from app.services.local_store import local_store

router = APIRouter()


@router.get("/projects/{project_id}/features", response_model=list[FeatureRead])
async def list_features(project_id: str) -> list[FeatureRead]:
    return local_store.list_features(project_id)


@router.post(
    "/projects/{project_id}/features",
    response_model=FeatureRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_feature(project_id: str, feature: FeatureCreate) -> FeatureRead:
    return local_store.create_feature(project_id, feature)


@router.patch("/features/{feature_id}", response_model=FeatureRead)
async def update_feature(feature_id: str, feature: FeatureUpdate) -> FeatureRead:
    return local_store.update_feature(feature_id, feature)


@router.delete("/features/{feature_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feature(feature_id: str) -> Response:
    local_store.delete_feature(feature_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

