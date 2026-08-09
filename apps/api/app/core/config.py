"""Application settings loaded from environment variables."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed 12-factor configuration for Harry OS API."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Harry OS API"
    app_env: Literal["local", "docker", "prod"] = "local"
    app_debug: bool = False
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    # Security
    secret_key: str = "change-me"
    access_token_ttl_minutes: int = 30
    refresh_token_ttl_days: int = 14
    remember_me_refresh_token_ttl_days: int = 30
    jwt_algorithm: str = "HS256"
    refresh_cookie_name: str = "harry_os_refresh"
    frontend_url: str = "http://localhost:5173"
    password_reset_ttl_minutes: int = 60

    # Database
    database_url: str = "mysql+aiomysql://harry:harry@127.0.0.1:3306/harry_os"
    database_echo: bool = False

    # Files
    media_root: str = "./data/media"
    max_upload_bytes: int = 20 * 1024 * 1024

    # Logging
    log_level: str = "INFO"
    log_json: bool = True

    # AI (architecture ready — logic not implemented)
    ai_enabled: bool = False
    llm_api_key: str | None = None
    llm_base_url: str | None = None  # OpenAI-compatible base URL
    llm_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    ai_allowed_modules: list[str] = Field(
        default_factory=lambda: [
            "trading",
            "books",
            "finance",
            "health",
            "planner",
            "goals",
            "knowledge",
        ]
    )
    ai_max_context_messages: int = 40
    ai_rag_top_k: int = 8

    # Obsidian import-only
    obsidian_vault_path: str | None = None

    @field_validator("cors_origins", "ai_allowed_modules", mode="before")
    @classmethod
    def parse_list_fields(cls, value: object) -> object:
        if isinstance(value, str):
            raw = value.strip()
            if raw.startswith("["):
                import json

                return json.loads(raw)
            return [part.strip() for part in raw.split(",") if part.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.app_env == "prod"


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance (composition root helper)."""
    return Settings()
