from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    app_name: str = "ScreenDeck API"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/screendeck"

    # JWT
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    # Cookie
    cookie_secure: bool = False  # Set to True in production (HTTPS)
    cookie_samesite: str = "lax"  # Use "none" for cross-origin in production

    # Storage
    use_local_storage: bool = True  # Use local storage for development
    local_storage_path: str = "/app/media"  # Path for local file storage
    media_base_url: str = "http://localhost:8000/media"  # Base URL for media files

    # Google Cloud Storage (used when use_local_storage is False)
    gcs_bucket_name: str = "screendeck-media"
    gcs_project_id: str = ""
    google_application_credentials: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Frontend URL for QR codes
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
