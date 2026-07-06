from functools import lru_cache

from pydantic import AnyHttpUrl, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = Field(default="local", alias="NEXUS_ENV")
    api_url: AnyHttpUrl | str = Field(default="http://localhost:8000", alias="NEXUS_API_URL")
    web_url: AnyHttpUrl | str = Field(default="http://localhost:5173", alias="NEXUS_WEB_URL")
    cors_origins_extra: str = Field(default="", alias="NEXUS_CORS_ORIGINS")
    database_url: str = "postgresql+asyncpg://nexus:nexus@localhost:5432/nexus"
    jwt_secret_key: str = Field(default="change-me", alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_issuer: str = Field(default="nexus-api", alias="JWT_ISSUER")
    jwt_audience: str = Field(default="nexus-web", alias="JWT_AUDIENCE")
    access_token_expire_minutes: int = Field(default=60, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    auth_backend: str = Field(default="local", alias="NEXUS_AUTH_BACKEND")
    firebase_project_id: str = Field(default="nexus-advait-pm", alias="FIREBASE_PROJECT_ID")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    anthropic_api_key: str | None = Field(default=None, alias="ANTHROPIC_API_KEY")
    google_ai_api_key: str | None = Field(default=None, alias="GOOGLE_AI_API_KEY")
    github_token: str | None = Field(default=None, alias="GITHUB_TOKEN")

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.env.lower() == "production" and (
            self.jwt_secret_key == "change-me" or len(self.jwt_secret_key) < 32
        ):
            raise ValueError("Production JWT_SECRET_KEY must contain at least 32 characters")
        if self.auth_backend not in {"local", "database"}:
            raise ValueError("NEXUS_AUTH_BACKEND must be local or database")
        if self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace(
                "postgres://", "postgresql+asyncpg://", 1
            )
        elif self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace(
                "postgresql://", "postgresql+asyncpg://", 1
            )
        return self

    @property
    def cors_origins(self) -> list[str]:
        configured = [origin.strip().rstrip("/") for origin in self.cors_origins_extra.split(",")]
        return list(
            dict.fromkeys(
                [
                    str(self.web_url).rstrip("/"),
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                    *[origin for origin in configured if origin],
                ]
            )
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
