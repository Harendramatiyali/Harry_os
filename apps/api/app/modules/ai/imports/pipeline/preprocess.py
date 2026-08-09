"""Stage 1 — preprocess uploaded notebook images."""

from __future__ import annotations

import hashlib
import struct

from app.modules.ai.imports.pipeline.types import PipelineImage, PreprocessPageResult


def _png_size(data: bytes) -> tuple[int, int] | None:
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    try:
        w, h = struct.unpack(">II", data[16:24])
        return int(w), int(h)
    except struct.error:
        return None


def _jpeg_size(data: bytes) -> tuple[int, int] | None:
    if len(data) < 4 or data[:2] != b"\xff\xd8":
        return None
    i = 2
    while i + 9 < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xC0, 0xC1, 0xC2):
            try:
                h, w = struct.unpack(">HH", data[i + 5 : i + 9])
                return int(w), int(h)
            except struct.error:
                return None
        if marker == 0xD9:
            break
        if marker in (0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0x01) or marker == 0x00:
            i += 2
            continue
        if i + 3 >= len(data):
            break
        length = struct.unpack(">H", data[i + 2 : i + 4])[0]
        i += 2 + length
    return None


def _quality_score(data: bytes, mime: str | None, file_name: str | None) -> tuple[float | None, list[str]]:
    warnings: list[str] = []
    if not data:
        return 0.0, ["empty image bytes"]

    size = None
    lower_mime = (mime or "").lower()
    lower_name = (file_name or "").lower()
    if "png" in lower_mime or lower_name.endswith(".png"):
        size = _png_size(data)
    elif "jpeg" in lower_mime or "jpg" in lower_mime or lower_name.endswith((".jpg", ".jpeg")):
        size = _jpeg_size(data)
    else:
        size = _png_size(data) or _jpeg_size(data)

    score = 0.55
    if size:
        w, h = size
        pixels = w * h
        if pixels < 80_000:
            score = 0.35
            warnings.append(f"low resolution ({w}x{h})")
        elif pixels < 300_000:
            score = 0.55
        else:
            score = 0.8
        if min(w, h) < 200:
            warnings.append("short side under 200px — OCR quality may suffer")
    else:
        warnings.append("could not read image dimensions")
        score = 0.45

    if len(data) < 5_000:
        score = min(score, 0.4)
        warnings.append("very small file size")

    return round(score, 3), warnings


def preprocess_images(images: list[PipelineImage]) -> list[PreprocessPageResult]:
    """Normalize metadata + lightweight quality scoring (no external deps)."""
    results: list[PreprocessPageResult] = []
    for image in sorted(images, key=lambda i: i.page_index):
        data = image.load_bytes()
        checksum = image.checksum or (hashlib.sha256(data).hexdigest() if data else None)
        quality, warnings = _quality_score(data, image.mime_type, image.file_name)
        results.append(
            PreprocessPageResult(
                page_id=image.page_id,
                page_index=image.page_index,
                file_name=image.file_name,
                mime_type=image.mime_type,
                byte_size=len(data),
                quality_score=quality,
                checksum=checksum,
                warnings=warnings,
            )
        )
    return results
