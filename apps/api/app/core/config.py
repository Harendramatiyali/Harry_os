"""Application settings loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def _empty_to_none(value: object) -> object:
    if isinstance(value, str) and value.strip() == "":
        return None
    return value


def _parse_str_list(value: object) -> object:
    """Accept JSON arrays or comma-separated strings from host env UIs."""
    if value is None:
        return value
    if isinstance(value, list):
        return value
    if not isinstance(value, str):
        return value

    raw = value.strip()
    if not raw:
        return []

    if raw.startswith("["):
        import json

        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        except json.JSONDecodeError:
            raw = raw.strip("[]")

    return [part.strip().strip('"').strip("'") for part in raw.split(",") if part.strip()]


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
    # NoDecode: host env UIs often use comma lists; default JSON decode breaks those.
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )

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

    # AI
    ai_enabled: bool = False
    llm_api_key: str | None = None
    llm_base_url: str | None = None
    llm_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    ai_allowed_modules: Annotated[list[str], NoDecode] = Field(
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

    @field_validator("app_env", mode="before")
    @classmethod
    def normalize_app_env(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        normalized = value.strip().lower()
        aliases = {
            "production": "prod",
            "prod": "prod",
            "local": "local",
            "development": "local",
            "dev": "local",
            "docker": "docker",
        }
        return aliases.get(normalized, normalized)

    @field_validator("cors_origins", "ai_allowed_modules", mode="before")
    @classmethod
    def parse_list_fields(cls, value: object) -> object:
        return _parse_str_list(value)

    @field_validator(
        "llm_api_key",
        "llm_base_url",
        "obsidian_vault_path",
        mode="before",
    )
    @classmethod
    def optional_str_fields(cls, value: object) -> object:
        return _empty_to_none(value)

    @property
    def is_production(self) -> bool:
        return self.app_env == "prod"


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance (composition root helper)."""
    return Settings()
