"""Authentication HTTP routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from app.core.config import Settings, get_settings
from app.modules.auth.deps import (
    AdminUserDep,
    AuthServiceDep,
    CurrentUserDep,
)
from app.modules.auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    UserPublic,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_refresh_cookie(
    response: Response,
    *,
    token: str,
    settings: Settings,
    remember_me: bool,
) -> None:
    max_age = (
        settings.remember_me_refresh_token_ttl_days * 24 * 60 * 60
        if remember_me
        else settings.refresh_token_ttl_days * 24 * 60 * 60
    )
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=max_age,
        path="/",
    )


def _clear_refresh_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path="/",
        samesite="lax",
        secure=settings.is_production,
    )


def _read_refresh_token(request: Request, settings: Settings) -> str | None:
    return request.cookies.get(settings.refresh_cookie_name) or request.headers.get(
        "X-Refresh-Token"
    )


def _client_meta(request: Request) -> tuple[str | None, str | None]:
    user_agent = request.headers.get("user-agent")
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else None)
    return user_agent, ip


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    body: SignupRequest,
    response: Response,
    service: AuthServiceDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenResponse:
    tokens = await service.signup(
        email=body.email,
        password=body.password,
        display_name=body.display_name,
    )
    _set_refresh_cookie(
        response,
        token=tokens.refresh_token,
        settings=settings,
        remember_me=tokens.remember_me,
    )
    return TokenResponse(
        access_token=tokens.access_token,
        expires_in=tokens.expires_in,
        user=service.to_public(tokens.user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    service: AuthServiceDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenResponse:
    user_agent, ip_address = _client_meta(request)
    tokens = await service.login(
        email=body.email,
        password=body.password,
        remember_me=body.remember_me,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    _set_refresh_cookie(
        response,
        token=tokens.refresh_token,
        settings=settings,
        remember_me=tokens.remember_me,
    )
    return TokenResponse(
        access_token=tokens.access_token,
        expires_in=tokens.expires_in,
        user=service.to_public(tokens.user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    response: Response,
    service: AuthServiceDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenResponse:
    refresh_token = _read_refresh_token(request, settings)
    if not refresh_token:
        from app.core.errors import UnauthorizedError

        raise UnauthorizedError("Refresh token missing")

    user_agent, ip_address = _client_meta(request)
    tokens = await service.refresh(
        refresh_token=refresh_token,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    _set_refresh_cookie(
        response,
        token=tokens.refresh_token,
        settings=settings,
        remember_me=tokens.remember_me,
    )
    return TokenResponse(
        access_token=tokens.access_token,
        expires_in=tokens.expires_in,
        user=service.to_public(tokens.user),
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    service: AuthServiceDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> MessageResponse:
    await service.logout(refresh_token=_read_refresh_token(request, settings))
    _clear_refresh_cookie(response, settings)
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserPublic)
async def me(user: CurrentUserDep, service: AuthServiceDep) -> UserPublic:
    return service.to_public(user)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    service: AuthServiceDep,
) -> ForgotPasswordResponse:
    message, reset_token, reset_url = await service.forgot_password(email=body.email)
    return ForgotPasswordResponse(message=message, reset_token=reset_token, reset_url=reset_url)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    body: ResetPasswordRequest,
    service: AuthServiceDep,
) -> MessageResponse:
    await service.reset_password(token=body.token, new_password=body.new_password)
    return MessageResponse(message="Password has been reset. You can sign in now.")


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    body: ChangePasswordRequest,
    user: CurrentUserDep,
    service: AuthServiceDep,
) -> MessageResponse:
    await service.change_password(
        user=user,
        current_password=body.current_password,
        new_password=body.new_password,
    )
    return MessageResponse(message="Password updated successfully")


@router.get("/admin/ping", response_model=MessageResponse)
async def admin_ping(_admin: AdminUserDep) -> MessageResponse:
    return MessageResponse(message="Admin access confirmed")
