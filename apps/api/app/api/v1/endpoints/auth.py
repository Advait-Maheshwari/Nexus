from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security import AuthContext, require_auth_context
from app.core.session_cookie import clear_refresh_cookie, set_refresh_cookie
from app.schemas.auth import (
    AccountDeleteRequest,
    AccountResponse,
    AccountUpdateRequest,
    AuthActionResponse,
    EmailActionRequest,
    FirebaseExchangeRequest,
    LoginRequest,
    PasswordChangeRequest,
    PasswordResetRequest,
    RegisterRequest,
    TokenActionRequest,
    TokenResponse,
)
from app.services.account_recovery import (
    begin_password_reset,
    resend_email_verification,
    reset_password,
    verify_email,
)
from app.services.database_auth import (
    VerificationIssue,
    change_password,
    delete_account,
    enter_private_demo,
    exchange_firebase_identity,
    get_account,
    login_user,
    register_user,
    revoke_all_sessions,
    revoke_refresh_token,
    rotate_refresh_token,
    update_account,
)
from app.services.firebase_auth import firebase_token_verifier
from app.services.local_store import local_store

router = APIRouter()


@router.post("/register", response_model=TokenResponse | AuthActionResponse)
async def register(
    request: RegisterRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse | AuthActionResponse:
    if settings.auth_backend == "database":
        issued = await register_user(request, session)
        if isinstance(issued, VerificationIssue):
            response.status_code = status.HTTP_202_ACCEPTED
            return AuthActionResponse(
                message=issued.message,
                verification_required=issued.verification_required,
            )
        set_refresh_cookie(response, issued.refresh_token)
        return issued.token
    return local_store.register(request)


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    if settings.auth_backend == "database":
        issued = await login_user(request, session)
        set_refresh_cookie(response, issued.refresh_token)
        return issued.token
    return local_store.login(request)


@router.post("/firebase", response_model=TokenResponse)
async def exchange_firebase(
    request: FirebaseExchangeRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    if settings.auth_backend != "database":
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Cloud account synchronization is not configured",
        )
    identity = await firebase_token_verifier.verify(request.id_token)
    issued = await exchange_firebase_identity(identity, session)
    set_refresh_cookie(response, issued.refresh_token)
    return issued.token


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    response: Response,
    session_header: str | None = Header(default=None, alias="X-Nexus-Session"),
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    if settings.auth_backend != "database":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session refresh is not configured")
    if session_header != "refresh":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Session refresh header is required")
    raw_token = request.cookies.get(settings.refresh_cookie_name)
    if not raw_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh session is missing")
    issued = await rotate_refresh_token(raw_token, session)
    set_refresh_cookie(response, issued.refresh_token)
    return issued.token


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    session_header: str | None = Header(default=None, alias="X-Nexus-Session"),
    session: AsyncSession = Depends(get_session),
) -> Response:
    if session_header != "logout":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Session logout header is required")
    if settings.auth_backend == "database":
        await revoke_refresh_token(request.cookies.get(settings.refresh_cookie_name), session)
    clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
async def logout_all(
    response: Response,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> Response:
    if settings.auth_backend == "database":
        await revoke_all_sessions(auth, session)
    clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=AccountResponse)
async def me(
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> AccountResponse:
    if settings.auth_backend == "database":
        return await get_account(auth, session)
    return local_store.get_account(auth.user_id)


@router.post("/demo", response_model=TokenResponse)
async def open_private_demo(
    response: Response,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    _require_database_accounts()
    issued = await enter_private_demo(auth, session)
    set_refresh_cookie(response, issued.refresh_token)
    return issued.token


@router.patch("/me", response_model=AccountResponse)
async def patch_me(
    request: AccountUpdateRequest,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> AccountResponse:
    _require_database_accounts()
    return await update_account(request, auth, session)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def remove_account(
    request: AccountDeleteRequest,
    response: Response,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> Response:
    _require_database_accounts()
    await delete_account(request, auth, session)
    clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
async def update_password(
    request: PasswordChangeRequest,
    response: Response,
    auth: AuthContext = Depends(require_auth_context),
    session: AsyncSession = Depends(get_session),
) -> Response:
    _require_database_accounts()
    await change_password(request, auth, session)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/email/resend", response_model=AuthActionResponse, status_code=status.HTTP_202_ACCEPTED
)
async def resend_verification(
    request: EmailActionRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthActionResponse:
    _require_database_accounts()
    await resend_email_verification(request.email, session)
    return AuthActionResponse(
        message="If the account needs verification, a new link has been sent.",
        verification_required=True,
    )


@router.post("/email/verify", status_code=status.HTTP_204_NO_CONTENT)
async def confirm_email(
    request: TokenActionRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> Response:
    _require_database_accounts()
    await verify_email(request.token, session)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post(
    "/password/forgot",
    response_model=AuthActionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def forgot_password(
    request: EmailActionRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthActionResponse:
    _require_database_accounts()
    await begin_password_reset(request.email, session)
    return AuthActionResponse(
        message="If the account can be recovered, a reset link has been sent."
    )


@router.post("/password/reset", status_code=status.HTTP_204_NO_CONTENT)
async def confirm_password_reset(
    request: PasswordResetRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> Response:
    _require_database_accounts()
    await reset_password(request.token, request.new_password, session)
    clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


def _require_database_accounts() -> None:
    if settings.auth_backend != "database":
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Cloud account management is not configured",
        )
