"""Universal AI Knowledge Import Engine.

Trading Journal import is one parser in this platform — not the platform itself.
Compatibility: HTTP routes remain under ``app.modules.ai.imports``.
"""

from __future__ import annotations

from app.modules.ai.import_engine.types import (
    ClassificationResult,
    ParserType,
    ReviewField,
)

__all__ = [
    "ClassificationResult",
    "ParserType",
    "ReviewField",
]
