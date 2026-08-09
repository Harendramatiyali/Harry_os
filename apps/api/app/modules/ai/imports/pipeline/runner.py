"""Pipeline orchestrator — delegates to Knowledge Import Engine runner.

Kept as a stable import path for existing callers and tests.
"""

from __future__ import annotations

from app.modules.ai.import_engine.runner import run_pipeline

__all__ = ["run_pipeline"]
