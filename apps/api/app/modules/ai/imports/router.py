"""AI Import Center HTTP routes."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Body, Depends, File, Query, UploadFile, status
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings
from app.core.deps import DbSessionDep
from app.core.errors import NotFoundError, UnauthorizedError
from app.core.security import decode_token
from app.modules.ai.imports.deps import AiImportServiceDep
from app.modules.ai.imports.schemas import (
    ConfirmDestinationOut,
    ConfirmDestinationRequest,
    ImportCommitOut,
    ImportCommitRequest,
    ImportJobCreate,
    ImportJobOut,
    ImportJobStatusOut,
    ImportPageOut,
    ImportPreviewOut,
    ImportPreviewRequest,
)
from app.modules.auth.deps import CurrentUserDep
from app.modules.auth.repository import UserRepository

router = APIRouter(prefix="/imports", tags=["ai-imports"])


@router.post(
    "/jobs",
    response_model=ImportJobOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create Import Session",
)
async def create_import_session(
    body: ImportJobCreate,
    user: CurrentUserDep,
    service: AiImportServiceDep,
) -> ImportJobOut:
    """Create a notebook import session (empty until images are uploaded)."""
    return await service.create_job(user.id, body)


@router.post(
    "/jobs/{job_id}/pages",
    response_model=list[ImportPageOut],
    status_code=status.HTTP_201_CREATED,
    summary="Upload Images",
)
async def upload_images(
    job_id: str,
    user: CurrentUserDep,
    service: AiImportServiceDep,
    files: list[UploadFile] = File(..., description="Notebook page images"),
) -> list[ImportPageOut]:
    """Upload one or more notebook page images to an import session."""
    payloads: list[tuple[str, str, bytes]] = []
    for upload in files:
        raw = await upload.read()
        payloads.append(
            (
                upload.filename or "page.png",
                upload.content_type or "application/octet-stream",
                raw,
            )
        )
    return await service.upload_pages(user.id, job_id, files=payloads)


@router.delete(
    "/jobs/{job_id}/pages/{page_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Image",
)
async def delete_image(
    job_id: str,
    page_id: str,
    user: CurrentUserDep,
    service: AiImportServiceDep,
) -> None:
    await service.delete_page(user.id, job_id, page_id)


@router.get(
    "/jobs/{job_id}/pages",
    response_model=list[ImportPageOut],
    summary="Get Uploaded Images",
)
async def get_uploaded_images(
    job_id: str,
    user: CurrentUserDep,
    service: AiImportServiceDep,
) -> list[ImportPageOut]:
    return await service.list_pages(user.id, job_id)


@router.get(
    "/pages/{page_id}/file",
    summary="Get Import Page File",
    responses={200: {"content": {"image/*": {}}}},
)
async def get_import_page_file(
    page_id: str,
    service: AiImportServiceDep,
    session: DbSessionDep,
    settings: Annotated[Settings, Depends(get_settings)],
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(HTTPBearer(auto_error=False))
    ] = None,
    access_token: str | None = Query(
        default=None,
        description="Optional access token for <img src> (Bearer header preferred).",
    ),
) -> FileResponse:
    """Serve a stored notebook page image. Auth via Bearer or access_token query."""
    raw = None
    if credentials and credentials.scheme.lower() == "bearer":
        raw = credentials.credentials
    elif access_token:
        raw = access_token
    if not raw:
        raise UnauthorizedError("Not authenticated")

    try:
        payload = decode_token(raw, settings)
    except ValueError as exc:
        raise UnauthorizedError("Invalid or expired access token") from exc
    if payload.get("type") != "access" or not payload.get("sub"):
        raise UnauthorizedError("Invalid access token")

    user = await UserRepository(session).get_by_id(str(payload["sub"]))
    if user is None or user.deleted_at is not None or not user.is_active:
        raise UnauthorizedError("User not found")

    page = await service.get_page_file(user.id, page_id)
    path = Path(page.storage_path) if page.storage_path else None
    if path is None or not path.is_file():
        raise NotFoundError("Import page file missing on disk")
    return FileResponse(
        path,
        media_type=page.mime_type or "application/octet-stream",
        filename=page.original_file_name or path.name,
    )


@router.get(
    "/jobs/{job_id}",
    response_model=ImportJobStatusOut,
    summary="Get Import Status",
)
async def get_import_status(
    job_id: str,
    user: CurrentUserDep,
    service: AiImportServiceDep,
) -> ImportJobStatusOut:
    return await service.get_status(user.id, job_id)


@router.post(
    "/jobs/{job_id}/preview",
    response_model=ImportPreviewOut,
    summary="Generate Preview",
)
async def generate_preview(
    job_id: str,
    user: CurrentUserDep,
    service: AiImportServiceDep,
    body: Annotated[ImportPreviewRequest | None, Body()] = None,
) -> ImportPreviewOut:
    """Run extraction pipeline (scaffold) and return a reviewable journal draft."""
    return await service.generate_preview(user.id, job_id, body)


@router.post(
    "/jobs/{job_id}/destination",
    response_model=ConfirmDestinationOut,
    summary="Confirm Destination",
)
async def confirm_destination(
    job_id: str,
    user: CurrentUserDep,
    service: AiImportServiceDep,
    body: ConfirmDestinationRequest,
) -> ConfirmDestinationOut:
    """User confirms AI-suggested destination (or Classify Later) before Review."""
    return await service.confirm_destination(user.id, job_id, body)


@router.post(
    "/jobs/{job_id}/commit",
    response_model=ImportCommitOut,
    summary="Save Journal",
)
async def save_journal(
    job_id: str,
    user: CurrentUserDep,
    service: AiImportServiceDep,
    body: Annotated[ImportCommitRequest | None, Body()] = None,
) -> ImportCommitOut:
    """Commit the reviewed draft into the confirmed destination module.

    Trading → trading journals. Inbox only via Classify Later / save_to_inbox.
    Rejects with 409 if a journal already exists for the draft `journal_date`.
    """
    return await service.save_journal(user.id, job_id, body)
