from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.observability import RequestObservabilityMiddleware
from app.core.request_limits import RequestSizeLimitMiddleware
from app.core.rate_limit import RateLimitMiddleware
from app.core.security_headers import SecurityHeadersMiddleware


def create_app() -> FastAPI:
    production = settings.env.lower() == "production"
    app = FastAPI(
        title="Nexus API",
        description="Project management, analytics, and AI orchestration for Nexus.",
        version="0.1.0",
        docs_url=None if production else "/docs",
        redoc_url=None if production else "/redoc",
        openapi_url=None if production else "/openapi.json",
    )

    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Nexus-Session"],
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestObservabilityMiddleware)
    app.add_middleware(RequestSizeLimitMiddleware)
    app.add_middleware(RateLimitMiddleware)

    app.include_router(api_router, prefix="/api/v1")

    @app.get("/")
    async def root() -> dict[str, str]:
        return {"name": "Nexus API", "status": "online"}

    return app


app = create_app()
