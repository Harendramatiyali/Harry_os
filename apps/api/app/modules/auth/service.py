"""Auth use-cases."""

from __future__ import annotations

import logging
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.core.config import Settings
from app.core.errors import ConflictError, DomainError, ForbiddenError, NotFoundError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.modules.auth.models import PasswordResetToken, RefreshSession, User, UserRole
from app.modules.auth.repository import (
    PasswordResetTokenRepository,
    RefreshSessionRepository,
    UserRepository,
)
from app.modules.auth.schemas import UserPublic

logger = logging.getLogger(__name__)


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


@dataclass
class AuthTokens:
    access_token: str
    refresh_token: str
    expires_in: int
    remember_me: bool
    user: User


class AuthService:
    def __init__(
        self,
        *,
        users: UserRepository,
        refresh_sessions: RefreshSessionRepository,
        password_resets: PasswordResetTokenRepository,
        settings: Settings,
    ) -> None:
        self.users = users
        self.refresh_sessions = refresh_sessions
        self.password_resets = password_resets
        self.settings = settings

    async def signup(
        self,
        *,
        email: str,
        password: str,
        display_name: str,
    ) -> AuthTokens:
        normalized = email.lower().strip()
        existing = await self.users.get_by_email(normalized)
        if existing:
            raise ConflictError("An account with this email already exists")

        role = UserRole.ADMIN if await self.users.count_users() == 0 else UserRole.USER
        user = User(
            id=str(uuid.uuid4()),
            email=normalized,
            password_hash=hash_password(password),
            display_name=display_name.strip(),
            role=role,
            is_active=True,
        )
        await self.users.add(user)
        return await self._issue_tokens(user=user, remember_me=False)

    async def login(
        self,
        *,
        email: str,
        password: str,
        remember_me: bool,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthTokens:
        user = await self.users.get_by_email(email.lower().strip())
        if user is None or not verify_password(password, user.password_hash):
            raise UnauthorizedError("Invalid email or password")
        if not user.is_active:
            raise ForbiddenError("Account is deactivated")

        user.last_login_at = datetime.now(timezone.utc)
        await self.users.session.flush()
        return await self._issue_tokens(
            user=user,
            remember_me=remember_me,
            user_agent=user_agent,
            ip_address=ip_address,
        )

    async def refresh(
        self,
        *,
        refresh_token: str,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthTokens:
        try:
            payload = decode_token(refresh_token, self.settings)
        except ValueError as exc:
            raise UnauthorizedError("Invalid refresh token") from exc

        if payload.get("type") != "refresh":
            raise UnauthorizedError("Invalid refresh token")

        jti = payload.get("jti")
        subject = payload.get("sub")
        if not jti or not subject:
            raise UnauthorizedError("Invalid refresh token")

        session_row = await self.refresh_sessions.get_by_id(jti)
        if session_row is None or session_row.user_id != subject:
            raise UnauthorizedError("Refresh session not found")
        if session_row.revoked_at is not None:
            raise UnauthorizedError("Refresh session revoked")
        if _as_utc(session_row.expires_at) < datetime.now(timezone.utc):
            raise UnauthorizedError("Refresh session expired")
        if session_row.token_hash != hash_token(refresh_token):
            raise UnauthorizedError("Refresh token mismatch")

        user = await self.users.get_by_id(subject)
        if user is None or user.deleted_at is not None or not user.is_active:
            raise UnauthorizedError("User unavailable")

        remember_me = bool(payload.get("remember_me", session_row.remember_me))
        now = datetime.now(timezone.utc)
        await self.refresh_sessions.revoke(session_row, when=now)

        return await self._issue_tokens(
            user=user,
            remember_me=remember_me,
            user_agent=user_agent,
            ip_address=ip_address,
            rotated_from_id=session_row.id,
        )

    async def logout(self, *, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        try:
            payload = decode_token(refresh_token, self.settings)
        except ValueError:
            return
        jti = payload.get("jti")
        if not jti:
            return
        session_row = await self.refresh_sessions.get_by_id(jti)
        if session_row and session_row.revoked_at is None:
            await self.refresh_sessions.revoke(session_row, when=datetime.now(timezone.utc))

    async def forgot_password(self, *, email: str) -> tuple[str, str | None, str | None]:
        message = "If an account exists for that email, password reset instructions were sent."
        user = await self.users.get_by_email(email.lower().strip())
        if user is None or not user.is_active:
            return message, None, None

        now = datetime.now(timezone.utc)
        await self.password_resets.invalidate_active_for_user(user.id, when=now)

        raw_token = secrets.token_urlsafe(32)
        row = PasswordResetToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=now + timedelta(minutes=self.settings.password_reset_ttl_minutes),
        )
        await self.password_resets.add(row)

        reset_url = f"{self.settings.frontend_url.rstrip('/')}/reset-password?token={raw_token}"
        logger.info("password_reset_created user_id=%s reset_url=%s", user.id, reset_url)

        if self.settings.app_debug or self.settings.app_env == "local":
            return message, raw_token, reset_url
        return message, None, None

    async def reset_password(self, *, token: str, new_password: str) -> None:
        row = await self.password_resets.get_by_token_hash(hash_token(token))
        now = datetime.now(timezone.utc)
        if row is None or row.used_at is not None:
            raise DomainError("Invalid or expired reset token")
        if _as_utc(row.expires_at) < now:
            raise DomainError("Invalid or expired reset token")

        user = await self.users.get_by_id(row.user_id)
        if user is None or user.deleted_at is not None:
            raise NotFoundError("User not found")

        user.password_hash = hash_password(new_password)
        row.used_at = now
        await self.users.session.flush()

        # Revoke all refresh sessions after password reset
        from sqlalchemy import select

        sessions = list(
            await self.refresh_sessions.session.scalars(
                select(RefreshSession).where(
                    RefreshSession.user_id == user.id,
                    RefreshSession.revoked_at.is_(None),
                )
            )
        )
        for session_row in sessions:
            session_row.revoked_at = now
        await self.users.session.flush()

    async def change_password(
        self,
        *,
        user: User,
        current_password: str,
        new_password: str,
    ) -> None:
        if not verify_password(current_password, user.password_hash):
            raise UnauthorizedError("Current password is incorrect")
        if current_password == new_password:
            raise DomainError("New password must be different from the current password")
        user.password_hash = hash_password(new_password)
        await self.users.session.flush()

    async def get_user(self, user_id: str) -> User:
        user = await self.users.get_by_id(user_id)
        if user is None or user.deleted_at is not None:
            raise NotFoundError("User not found")
        return user

    def to_public(self, user: User) -> UserPublic:
        return UserPublic.model_validate(user)

    async def _issue_tokens(
        self,
        *,
        user: User,
        remember_me: bool,
        user_agent: str | None = None,
        ip_address: str | None = None,
        rotated_from_id: str | None = None,
    ) -> AuthTokens:
        jti = str(uuid.uuid4())
        days = (
            self.settings.remember_me_refresh_token_ttl_days
            if remember_me
            else self.settings.refresh_token_ttl_days
        )
        refresh_token = create_refresh_token(
            subject=user.id,
            settings=self.settings,
            jti=jti,
            remember_me=remember_me,
        )
        access_token = create_access_token(
            subject=user.id,
            settings=self.settings,
            extra_claims={"role": user.role.value, "email": user.email},
        )

        session_row = RefreshSession(
            id=jti,
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            expires_at=datetime.now(timezone.utc) + timedelta(days=days),
            remember_me=remember_me,
            rotated_from_id=rotated_from_id,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        await self.refresh_sessions.add(session_row)

        return AuthTokens(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=self.settings.access_token_ttl_minutes * 60,
            remember_me=remember_me,
            user=user,
        )
