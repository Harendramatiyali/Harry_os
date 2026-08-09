"""Auth FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings
from app.core.deps import DbSessionDep
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.modules.auth.models import User, UserRole
from app.modules.auth.repository import (
    get_password_reset_repository,
    get_refresh_session_repository,
    get_user_repository,
)
from app.modules.auth.service import AuthService

bearer_scheme = HTTPBearer(auto_error=False)


def get_auth_service(
    session: DbSessionDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthService:
    return AuthService(
        users=get_user_repository(session),
        refresh_sessions=get_refresh_session_repository(session),
        password_resets=get_password_reset_repository(session),
        settings=settings,
    )


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


async def get_current_user(
    session: DbSessionDep,
    settings: Annotated[Settings, Depends(get_settings)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError("Not authenticated")

    try:
        payload = decode_token(credentials.credentials, settings)
    except ValueError as exc:
        raise UnauthorizedError("Invalid or expired access token") from exc

    if payload.get("type") != "access":
        raise UnauthorizedError("Invalid access token")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Invalid access token")

    users = get_user_repository(session)
    user = await users.get_by_id(user_id)
    if user is None or user.deleted_at is not None:
        raise UnauthorizedError("User not found")
    if not user.is_active:
        raise ForbiddenError("Account is deactivated")
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


async def get_current_admin(user: CurrentUserDep) -> User:
    if user.role != UserRole.ADMIN:
        raise ForbiddenError("Admin access required")
    return user


AdminUserDep = Annotated[User, Depends(get_current_admin)]
