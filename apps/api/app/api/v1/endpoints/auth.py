from fastapi import APIRouter

from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.services.local_store import local_store

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest) -> TokenResponse:
    return local_store.register(request)


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest) -> TokenResponse:
    return local_store.login(request)

