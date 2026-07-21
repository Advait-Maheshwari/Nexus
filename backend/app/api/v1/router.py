from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    configuration,
    features,
    health,
    integrations,
    mission_control,
    planning,
    projects,
    tasks,
    workspaces,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
api_router.include_router(mission_control.router, prefix="/mission-control", tags=["mission-control"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(features.router, tags=["features"])
api_router.include_router(tasks.router, tags=["tasks"])
api_router.include_router(configuration.router, tags=["configuration"])
api_router.include_router(planning.router, tags=["planning"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
