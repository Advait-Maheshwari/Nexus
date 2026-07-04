from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = Field(default="local", alias="NEXUS_ENV")
    api_url: AnyHttpUrl | str = Field(default="http://localhost:8000", alias="NEXUS_API_URL")
    web_url: AnyHttpUrl | str = Field(default="http://localhost:5173", alias="NEXUS_WEB_URL")
    database_url: str = "postgresql+asyncpg://nexus:nexus@localhost:5432/nexus"
    jwt_secret_key: str = Field(default="change-me", alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=60, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    anthropic_api_key: str | None = Field(default=None, alias="ANTHROPIC_API_KEY")
    google_ai_api_key: str | None = Field(default=None, alias="GOOGLE_AI_API_KEY")

    @property
    def cors_origins(self) -> list[str]:
        return [str(self.web_url), "http://localhost:5173", "http://127.0.0.1:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

