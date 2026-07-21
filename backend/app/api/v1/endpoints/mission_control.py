from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security import AuthContext, require_auth_context
from app.schemas.analytics import MissionControlSummary
from app.services.analytics import build_database_mission_control, build_local_mission_control
from app.services.local_store import local_store

router = APIRouter()


@router.get("", response_model=MissionControlSummary)
async def get_mission_control(
    session: AsyncSession = Depends(get_session),
    auth: AuthContext = Depends(require_auth_context),
) -> MissionControlSummary:
    if settings.auth_backend == "database":
        return await build_database_mission_control(session, auth)
    return build_local_mission_control(local_store)
