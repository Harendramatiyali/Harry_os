"""Trading review field metadata for the generic Review Engine."""

from __future__ import annotations

from app.modules.ai.import_engine.types import ReviewField

TRADING_REVIEW_FIELDS: list[ReviewField] = [
    ReviewField(key="title", label="Title", field_type="text", group="header"),
    ReviewField(key="journal_date", label="Journal date", field_type="date", required=True, group="header"),
    ReviewField(key="market", label="Market", field_type="text", group="header"),
    ReviewField(key="primary_instrument", label="Primary instrument", field_type="text", group="header"),
    ReviewField(key="day_bias", label="Day bias", field_type="text", group="header"),
    ReviewField(key="overall_grade", label="Overall grade", field_type="text", group="header"),
    ReviewField(
        key="sections",
        label="Day sections",
        field_type="section_list",
        group="body",
        description="Narrative day sections",
    ),
    ReviewField(
        key="trades",
        label="Trades",
        field_type="trade_list",
        group="body",
        description="Structured trade blocks",
    ),
    ReviewField(
        key="confidence",
        label="Confidence",
        field_type="confidence",
        group="meta",
    ),
]
