from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+asyncpg://localhost/job_hunt_manager"
    encryption_key: str = ""  # Fernet key — must be set in .env for production


settings = Settings()
