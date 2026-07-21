from functools import lru_cache
from hashlib import sha256
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import AnyHttpUrl, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = Field(default="local", alias="NEXUS_ENV")
    api_url: AnyHttpUrl | str = Field(default="http://localhost:8000", alias="NEXUS_API_URL")
    web_url: AnyHttpUrl | str = Field(default="http://localhost:5173", alias="NEXUS_WEB_URL")
    cors_origins_extra: str = Field(default="", alias="NEXUS_CORS_ORIGINS")
    allowed_hosts_extra: str = Field(default="", alias="NEXUS_ALLOWED_HOSTS")
    database_url: str = "postgresql+asyncpg://nexus:nexus@localhost:5432/nexus"
    jwt_secret_key: str = Field(default="change-me", alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_issuer: str = Field(default="nexus-api", alias="JWT_ISSUER")
    jwt_audience: str = Field(default="nexus-web", alias="JWT_AUDIENCE")
    access_token_expire_minutes: int = Field(default=60, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=14, alias="REFRESH_TOKEN_EXPIRE_DAYS")
    refresh_cookie_name: str = Field(default="nexus_refresh", alias="REFRESH_COOKIE_NAME")
    auth_backend: str = Field(default="local", alias="NEXUS_AUTH_BACKEND")
    allow_password_registration: bool = Field(
        default=True, alias="NEXUS_ALLOW_PASSWORD_REGISTRATION"
    )
    demo_owner_email_hashes: str = Field(default="", alias="NEXUS_DEMO_OWNER_EMAIL_HASHES")
    firebase_project_id: str = Field(default="nexus-advait-pm", alias="FIREBASE_PROJECT_ID")
    require_email_verification: bool = Field(
        default=False, alias="NEXUS_REQUIRE_EMAIL_VERIFICATION"
    )
    email_delivery_mode: str = Field(default="console", alias="NEXUS_EMAIL_DELIVERY_MODE")
    email_from_address: str = Field(default="noreply@nexus.local", alias="NEXUS_EMAIL_FROM")
    smtp_host: str | None = Field(default=None, alias="NEXUS_SMTP_HOST")
    smtp_port: int = Field(default=587, alias="NEXUS_SMTP_PORT")
    smtp_username: str | None = Field(default=None, alias="NEXUS_SMTP_USERNAME")
    smtp_password: str | None = Field(default=None, alias="NEXUS_SMTP_PASSWORD")
    smtp_starttls: bool = Field(default=True, alias="NEXUS_SMTP_STARTTLS")
    email_verification_expire_hours: int = Field(
        default=24, alias="EMAIL_VERIFICATION_EXPIRE_HOURS"
    )
    password_reset_expire_minutes: int = Field(default=30, alias="PASSWORD_RESET_EXPIRE_MINUTES")
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
        if self.env.lower() == "production" and self.auth_backend != "database":
            raise ValueError("Production requires NEXUS_AUTH_BACKEND=database")
        if self.email_delivery_mode not in {"disabled", "console", "smtp"}:
            raise ValueError("NEXUS_EMAIL_DELIVERY_MODE must be disabled, console, or smtp")
        if self.env.lower() == "production" and self.email_delivery_mode == "console":
            raise ValueError("Console email delivery cannot be used in production")
        if self.require_email_verification and self.email_delivery_mode == "disabled":
            raise ValueError("Email delivery is required when email verification is enabled")
        if self.env.lower() == "production" and self.allow_password_registration and (
            not self.require_email_verification or self.email_delivery_mode != "smtp"
        ):
            raise ValueError(
                "Production password registration requires verified SMTP email delivery"
            )
        if self.email_delivery_mode == "smtp" and (
            not self.smtp_host or not self.email_from_address
        ):
            raise ValueError("SMTP delivery requires NEXUS_SMTP_HOST and NEXUS_EMAIL_FROM")
        if self.smtp_port < 1 or self.smtp_port > 65535:
            raise ValueError("NEXUS_SMTP_PORT must be a valid TCP port")
        if self.email_verification_expire_hours < 1 or self.email_verification_expire_hours > 72:
            raise ValueError("EMAIL_VERIFICATION_EXPIRE_HOURS must be between 1 and 72")
        if self.password_reset_expire_minutes < 10 or self.password_reset_expire_minutes > 120:
            raise ValueError("PASSWORD_RESET_EXPIRE_MINUTES must be between 10 and 120")
        if self.access_token_expire_minutes < 5 or self.access_token_expire_minutes > 120:
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be between 5 and 120")
        if self.refresh_token_expire_days < 1 or self.refresh_token_expire_days > 30:
            raise ValueError("REFRESH_TOKEN_EXPIRE_DAYS must be between 1 and 30")
        self.database_url = normalize_database_url(self.database_url)
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

    def private_demo_allowed(self, email: str) -> bool:
        digest = sha256(email.strip().lower().encode("utf-8")).hexdigest()
        configured = {
            value.strip().lower()
            for value in self.demo_owner_email_hashes.split(",")
            if value.strip()
        }
        return digest in configured

    @property
    def allowed_hosts(self) -> list[str]:
        configured = [host.strip().lower() for host in self.allowed_hosts_extra.split(",")]
        url_hosts = [
            urlsplit(str(url)).hostname
            for url in (self.api_url, self.web_url)
        ]
        return list(
            dict.fromkeys(
                [
                    "localhost",
                    "127.0.0.1",
                    "test",
                    "testserver",
                    *[host for host in url_hosts if host],
                    *[host for host in configured if host],
                ]
            )
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    if not database_url.startswith("postgresql+asyncpg://"):
        return database_url

    parsed = urlsplit(database_url)
    query_items = dict(parse_qsl(parsed.query, keep_blank_values=True))
    sslmode = query_items.pop("sslmode", None)
    query_items.pop("channel_binding", None)

    if sslmode and "ssl" not in query_items:
        query_items["ssl"] = sslmode

    return urlunsplit(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            urlencode(query_items),
            parsed.fragment,
        )
    )


settings = get_settings()
