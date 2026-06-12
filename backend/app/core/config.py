from pathlib import Path

from pydantic_settings import BaseSettings

_REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_env: str = "development"
    secret_key: str
    host: str = "127.0.0.1"
    port: int = 8000
    # Plain str — pydantic-settings would JSON-decode a list[str] field before validators run.
    allowed_origins: str = "http://localhost:5173"
    database_url: str
    supabase_url: str
    supabase_service_role_key: str
    storage_bucket: str = "uploads"
    anthropic_api_key: str
    anthropic_model: str = "claude-opus-4-8"
    log_level: str = "INFO"

    # Anchored to the repo root so imports work from any working directory.
    model_config = {"env_file": _REPO_ROOT / ".env"}


settings = Settings()
