from fastapi import APIRouter

from app.schemas.analytics import MissionControlSummary
from app.services.analytics import build_seed_mission_control

router = APIRouter()


@router.get("", response_model=MissionControlSummary)
async def get_mission_control() -> MissionControlSummary:
    return build_seed_mission_control()

