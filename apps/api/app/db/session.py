"""Async SQLAlchemy engine and session factory."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

_settings = get_settings()

_engine_kwargs: dict = {
    "echo": _settings.database_echo,
}

if _settings.database_url.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs["pool_pre_ping"] = True

engine = create_async_engine(_settings.database_url, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: one session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Create tables for local SQLite (MySQL uses Alembic migrations)."""
    if not _settings.database_url.startswith("sqlite"):
        return

    # Ensure models are registered on Base.metadata
    from app.db.base import Base
    from app.modules.auth import models as _auth_models  # noqa: F401
    from app.modules.planner import models as _planner_models  # noqa: F401
    from app.modules.knowledge import models as _knowledge_models  # noqa: F401
    from app.modules.trading import models as _trading_models  # noqa: F401
    from app.modules.books import models as _books_models  # noqa: F401
    from app.modules.finance import models as _finance_models  # noqa: F401
    from app.modules.health import models as _health_models  # noqa: F401
    from app.modules.ai import models as _ai_models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
