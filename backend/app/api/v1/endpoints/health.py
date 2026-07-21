from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session

router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
async def readiness_check(
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    if settings.auth_backend == "database":
        try:
            await session.execute(text("SELECT 1"))
        except Exception as error:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "Database is unavailable",
            ) from error
    return {"status": "ready", "database": settings.auth_backend}
