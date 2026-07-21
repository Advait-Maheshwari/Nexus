from fastapi import Response

from app.core.config import settings


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    production = settings.env.lower() == "production"
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 86_400,
        httponly=True,
        secure=production,
        samesite="none" if production else "lax",
        path="/api/v1/auth",
    )


def clear_refresh_cookie(response: Response) -> None:
    production = settings.env.lower() == "production"
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        httponly=True,
        secure=production,
        samesite="none" if production else "lax",
        path="/api/v1/auth",
    )
