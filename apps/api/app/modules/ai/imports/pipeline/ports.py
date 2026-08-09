"""Pipeline engine ports (in-process protocols — no DB)."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.modules.ai.imports.pipeline.types import (
    OcrPageResult,
    PipelineImage,
    PipelineOptions,
    UnderstandingResult,
)


@runtime_checkable
class OcrEngine(Protocol):
    name: str

    async def extract(self, image: PipelineImage) -> OcrPageResult: ...


@runtime_checkable
class UnderstandingEngine(Protocol):
    name: str

    async def understand(
        self,
        ocr_pages: list[OcrPageResult],
        *,
        options: PipelineOptions,
    ) -> UnderstandingResult: ...
