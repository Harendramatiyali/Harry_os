"""Domain and HTTP exception types plus FastAPI handlers."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger

logger = get_logger(__name__)


class AppError(Exception):
    """Base application error mapped to a stable API error envelope."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "app_error",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found", *, details: Any = None) -> None:
        super().__init__(
            message,
            code="not_found",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Unauthorized", *, details: Any = None) -> None:
        super().__init__(
            message,
            code="unauthorized",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden", *, details: Any = None) -> None:
        super().__init__(
            message,
            code="forbidden",
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


class ConflictError(AppError):
    def __init__(self, message: str = "Conflict", *, details: Any = None) -> None:
        super().__init__(
            message,
            code="conflict",
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class NotImplementedAppError(AppError):
    """Feature seam reserved but not wired yet (e.g. LLM / RAG)."""

    def __init__(
        self,
        message: str = "Not implemented",
        *,
        details: Any = None,
    ) -> None:
        super().__init__(
            message,
            code="not_implemented",
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            details=details,
        )


class DomainError(AppError):
    def __init__(self, message: str, *, details: Any = None) -> None:
        super().__init__(
            message,
            code="domain_error",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


def _correlation_id(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


def _error_body(
    *,
    code: str,
    message: str,
    correlation_id: str | None,
    details: Any = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
            "correlation_id": correlation_id,
        }
    }
    if details is not None:
        body["error"]["details"] = details
    return body


def register_exception_handlers(app: FastAPI) -> None:
    """Attach centralized exception handlers to the FastAPI app."""

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(
                code=exc.code,
                message=exc.message,
                correlation_id=_correlation_id(request),
                details=exc.details,
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(
                code="http_error",
                message=str(exc.detail),
                correlation_id=_correlation_id(request),
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_body(
                code="validation_error",
                message="Request validation failed",
                correlation_id=_correlation_id(request),
                details=exc.errors(),
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "Unhandled exception",
            extra={"correlation_id": _correlation_id(request), "path": request.url.path},
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_body(
                code="internal_error",
                message="Internal server error",
                correlation_id=_correlation_id(request),
            ),
        )
