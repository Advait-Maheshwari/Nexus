from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security import AuthContext, require_auth_context
from app.schemas.planning import (
    IdeaCreate,
    IdeaRead,
    JournalCreate,
    JournalRead,
    MilestoneCreate,
    MilestoneRead,
    MilestoneUpdate,
)
from app.services.database_planning import database_planning

router = APIRouter()


def require_database() -> None:
    if settings.auth_backend != "database":
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Cloud planning storage is not configured",
        )


@router.get("/ideas", response_model=list[IdeaRead])
async def list_ideas(
    project_id: str | None = None,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> list[IdeaRead]:
    require_database()
    return await database_planning.list_ideas(session, auth, project_id)


@router.post(
    "/projects/{project_id}/ideas",
    response_model=IdeaRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_idea(
    project_id: str,
    data: IdeaCreate,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> IdeaRead:
    require_database()
    return await database_planning.create_idea(session, auth, project_id, data)


@router.delete("/ideas/{idea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_idea(
    idea_id: str,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> Response:
    require_database()
    await database_planning.delete_idea(session, auth, idea_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/journal", response_model=list[JournalRead])
async def list_journal(
    project_id: str | None = None,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> list[JournalRead]:
    require_database()
    return await database_planning.list_journal(session, auth, project_id)


@router.post(
    "/projects/{project_id}/journal",
    response_model=JournalRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_journal(
    project_id: str,
    data: JournalCreate,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> JournalRead:
    require_database()
    return await database_planning.create_journal(session, auth, project_id, data)


@router.delete("/journal/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journal(
    entry_id: str,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> Response:
    require_database()
    await database_planning.delete_journal(session, auth, entry_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/milestones", response_model=list[MilestoneRead])
async def list_milestones(
    project_id: str | None = None,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> list[MilestoneRead]:
    require_database()
    return await database_planning.list_milestones(session, auth, project_id)


@router.post(
    "/projects/{project_id}/milestones",
    response_model=MilestoneRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_milestone(
    project_id: str,
    data: MilestoneCreate,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> MilestoneRead:
    require_database()
    return await database_planning.create_milestone(session, auth, project_id, data)


@router.patch("/milestones/{milestone_id}", response_model=MilestoneRead)
async def update_milestone(
    milestone_id: str,
    data: MilestoneUpdate,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> MilestoneRead:
    require_database()
    return await database_planning.update_milestone(session, auth, milestone_id, data)


@router.delete("/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_milestone(
    milestone_id: str,
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> Response:
    require_database()
    await database_planning.delete_milestone(session, auth, milestone_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
