"""Application settings loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _empty_to_none(value: object) -> object:
    if isinstance(value, str) and value.strip() == "":
        return None
    return value


def _parse_str_list(value: object) -> list[str]:
    """Accept JSON arrays, comma-separated strings, or real lists."""
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if not isinstance(value, str):
        return [str(value)]

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


def _parse_bool(value: object) -> object:
    """Accept common host-env boolean forms; ignore accidental KEY=KEY mistakes."""
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return False
        lowered = raw.lower()
        # Render UI mistake: value pasted as the variable name itself.
        if lowered in {"ai_enabled", "app_debug", "database_echo", "log_json"}:
            return False
        if lowered in {"1", "true", "t", "yes", "y", "on"}:
            return True
        if lowered in {"0", "false", "f", "no", "n", "off"}:
            return False
    return value


class Settings(BaseSettings):
    """Typed 12-factor configuration for Harry OS API."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        # Host platforms (Render) often pass list-like env as plain strings.
        enable_decoding=False,
    )

    # Application
    app_name: str = "Harry OS API"
    app_env: Literal["local", "docker", "prod"] = "local"
    app_debug: bool = False
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    # Stored as string so env never hits JSON list decoding.
    cors_origins: str = "http://localhost:5173"

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
    ai_allowed_modules: str = (
        "trading,books,finance,health,planner,goals,knowledge"
    )
    ai_max_context_messages: int = 40
    ai_rag_top_k: int = 8

    # Obsidian import-only
    obsidian_vault_path: str | None = None

    @field_validator("app_env", mode="before")
    @classmethod
    def normalize_app_env(cls, value: object) -> object:
        if value is None:
            return "local"
        if not isinstance(value, str):
            return value
        normalized = value.strip().lower()
        if not normalized:
            return "local"
        aliases = {
            "production": "prod",
            "prod": "prod",
            "local": "local",
            "development": "local",
            "dev": "local",
            "docker": "docker",
        }
        return aliases.get(normalized, normalized)

    @field_validator(
        "app_debug",
        "database_echo",
        "log_json",
        "ai_enabled",
        mode="before",
    )
    @classmethod
    def normalize_bools(cls, value: object) -> object:
        return _parse_bool(value)

    @field_validator("cors_origins", "ai_allowed_modules", mode="before")
    @classmethod
    def stringify_list_env(cls, value: object) -> object:
        # If a platform injects a real list, flatten to comma string.
        if isinstance(value, list):
            return ",".join(str(item).strip() for item in value if str(item).strip())
        return value

    @field_validator(
        "llm_api_key",
        "llm_base_url",
        "obsidian_vault_path",
        mode="before",
    )
    @classmethod
    def optional_str_fields(cls, value: object) -> object:
        return _empty_to_none(value)

    @model_validator(mode="after")
    def drop_bundled_obsidian_path_in_prod(self) -> Settings:
        # Local .env must never ship into prod containers.
        if self.is_production and self.obsidian_vault_path and self.obsidian_vault_path.startswith(
            "/Users/"
        ):
            self.obsidian_vault_path = None
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return _parse_str_list(self.cors_origins)

    @property
    def ai_allowed_module_list(self) -> list[str]:
        return _parse_str_list(self.ai_allowed_modules)

    @property
    def is_production(self) -> bool:
        return self.app_env == "prod"


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance (composition root helper)."""
    return Settings()
