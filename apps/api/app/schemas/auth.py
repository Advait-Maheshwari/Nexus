from pydantic import BaseModel, Field, field_validator

ALLOWED_AVATAR_PRESETS = {
    "/avatars/atlas.svg",
    "/avatars/luna.svg",
    "/avatars/nova.svg",
    "/avatars/orbit.svg",
}


def normalize_full_name(value: str) -> str:
    normalized = " ".join(value.split())
    if not normalized or not all(
        character.isalpha() or character == " " for character in normalized
    ):
        raise ValueError("Full name can contain letters and spaces only")
    return normalized


def validate_password_strength(value: str) -> str:
    if not any(character.isalpha() for character in value) or not any(
        character.isdigit() for character in value
    ):
        raise ValueError("Password must contain at least one letter and one number")
    return value


def normalize_email_address(value: str) -> str:
    normalized = value.strip().lower()
    local, separator, domain = normalized.partition("@")
    if not separator or not local or "." not in domain or domain.startswith("."):
        raise ValueError("Enter a valid email address")
    return normalized


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    full_name: str = Field(min_length=1, max_length=160)
    password: str = Field(min_length=10, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return normalize_email_address(value)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        return normalize_full_name(value)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class EmailActionRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return normalize_email_address(value)


class TokenActionRequest(BaseModel):
    token: str = Field(min_length=32, max_length=512)


class PasswordResetRequest(TokenActionRequest):
    new_password: str = Field(min_length=10, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)


class AuthActionResponse(BaseModel):
    message: str
    verification_required: bool = False


class FirebaseExchangeRequest(BaseModel):
    id_token: str = Field(min_length=100, max_length=8192)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    workspace_id: str
    full_name: str | None = None
    email: str | None = None
    role: str | None = None


class AccountResponse(BaseModel):
    user_id: str
    workspace_id: str
    full_name: str
    email: str
    avatar_url: str | None = None
    role: str
    workspace_name: str
    password_enabled: bool
    email_verified: bool


class AccountUpdateRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=160)
    avatar_url: str | None = Field(default=None, max_length=120)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        return normalize_full_name(value)

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, value: str | None) -> str | None:
        if value is None or value in ALLOWED_AVATAR_PRESETS:
            return value
        raise ValueError("Choose one of the bundled Nexus profile pictures")


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)
