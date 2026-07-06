from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.schemas.auth import FirebaseExchangeRequest, LoginRequest, RegisterRequest, TokenResponse
from app.services.database_auth import exchange_firebase_identity, login_user, register_user
from app.services.firebase_auth import firebase_token_verifier
from app.services.local_store import local_store

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(
    request: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    if settings.auth_backend == "database":
        return await register_user(request, session)
    return local_store.register(request)


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    if settings.auth_backend == "database":
        return await login_user(request, session)
    return local_store.login(request)


@router.post("/firebase", response_model=TokenResponse)
async def exchange_firebase(
    request: FirebaseExchangeRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    if settings.auth_backend != "database":
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Cloud account synchronization is not configured",
        )
    identity = await firebase_token_verifier.verify(request.id_token)
    return await exchange_firebase_identity(identity, session)
