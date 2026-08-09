"""Auth persistence layer."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repository import BaseRepository
from app.modules.auth.models import PasswordResetToken, RefreshSession, User


class UserRepository(BaseRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email.lower(), User.deleted_at.is_(None))
        return await self.session.scalar(stmt)

    async def count_users(self) -> int:
        from sqlalchemy import func

        stmt = select(func.count()).select_from(User).where(User.deleted_at.is_(None))
        return int(await self.session.scalar(stmt) or 0)


class RefreshSessionRepository(BaseRepository[RefreshSession]):
    model = RefreshSession

    async def get_by_token_hash(self, token_hash: str) -> RefreshSession | None:
        stmt = select(RefreshSession).where(RefreshSession.token_hash == token_hash)
        return await self.session.scalar(stmt)

    async def revoke(self, session_row: RefreshSession, *, when: datetime) -> None:
        session_row.revoked_at = when
        await self.session.flush()


class PasswordResetTokenRepository(BaseRepository[PasswordResetToken]):
    model = PasswordResetToken

    async def get_by_token_hash(self, token_hash: str) -> PasswordResetToken | None:
        stmt = select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        return await self.session.scalar(stmt)

    async def invalidate_active_for_user(self, user_id: str, *, when: datetime) -> None:
        stmt = select(PasswordResetToken).where(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.used_at.is_(None),
        )
        rows = list(await self.session.scalars(stmt))
        for row in rows:
            row.used_at = when
        await self.session.flush()


def get_user_repository(session: AsyncSession) -> UserRepository:
    return UserRepository(session)


def get_refresh_session_repository(session: AsyncSession) -> RefreshSessionRepository:
    return RefreshSessionRepository(session)


def get_password_reset_repository(session: AsyncSession) -> PasswordResetTokenRepository:
    return PasswordResetTokenRepository(session)
