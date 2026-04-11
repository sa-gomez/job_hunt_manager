from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+asyncpg://localhost/job_hunt_manager"
    encryption_key: str = ""  # Fernet key — must be set in .env for production

    # Google Sheets integration
    google_client_id: str = ""
    google_client_secret: str = ""
    google_sheet_id: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"
    sheets_poll_interval: int = 300  # seconds between sheet → DB polls

    # Frontend base URL — used for OAuth callback redirects
    frontend_base_url: str = "http://localhost:5173"

    @field_validator("encryption_key")
    @classmethod
    def encryption_key_must_be_set(cls, v: str) -> str:
        if not v:
            raise ValueError(
                "ENCRYPTION_KEY must be set in .env. "
                "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        return v


settings = Settings()
