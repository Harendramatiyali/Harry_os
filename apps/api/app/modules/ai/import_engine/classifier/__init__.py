"""Document classifier — detect knowledge domain + confidence."""

from __future__ import annotations

import re

from app.modules.ai.import_engine.types import (
    ClassificationResult,
    DestinationModule,
    ParserType,
)
from app.modules.ai.imports.pipeline.types import OcrPageResult, PipelineOptions

_RULES: list[tuple[ParserType, DestinationModule, list[re.Pattern[str]], float]] = [
    (
        ParserType.TRADING,
        DestinationModule.TRADING,
        [
            re.compile(r"\b(nifty|banknifty|sensex|trade\s*\d+|entry|exit|pnl|ce\b|pe\b)\b", re.I),
            re.compile(r"\b(market\s+context|trading\s+plan|day\s+bias)\b", re.I),
            re.compile(r"📅\s*date", re.I),
        ],
        1.0,
    ),
    (
        ParserType.BOOK,
        DestinationModule.BOOKS,
        [
            re.compile(r"\b(chapter|author|quote|vocabulary|key\s+learning)\b", re.I),
            re.compile(r"\b(book\s+notes?|summary)\b", re.I),
        ],
        0.9,
    ),
    (
        ParserType.MEETING,
        DestinationModule.PLANNER,
        [
            re.compile(r"\b(agenda|action\s+items?|follow[\s-]?ups?|attendees)\b", re.I),
            re.compile(r"\b(meeting\s+notes?|decisions?)\b", re.I),
        ],
        0.9,
    ),
    (
        ParserType.FINANCE,
        DestinationModule.FINANCE,
        [
            re.compile(r"\b(watchlist|portfolio|sip|mutual\s+fund|investment)\b", re.I),
        ],
        0.85,
    ),
    (
        ParserType.HEALTH,
        DestinationModule.HEALTH,
        [
            re.compile(r"\b(workout|nutrition|calories|protein|weight\s*kg)\b", re.I),
        ],
        0.85,
    ),
    (
        ParserType.ENGLISH,
        DestinationModule.KNOWLEDGE,
        [
            re.compile(r"\b(vocabulary|grammar|synonym|idiom|pronunciation)\b", re.I),
        ],
        0.8,
    ),
    (
        ParserType.PROJECT,
        DestinationModule.PLANNER,
        [
            re.compile(r"\b(api\s+design|database\s+schema|requirements|architecture)\b", re.I),
        ],
        0.8,
    ),
    (
        ParserType.RESEARCH,
        DestinationModule.KNOWLEDGE,
        [
            re.compile(r"\b(hypothesis|citation|literature|research\s+question)\b", re.I),
        ],
        0.75,
    ),
    (
        ParserType.DAILY_JOURNAL,
        DestinationModule.KNOWLEDGE,
        [
            re.compile(r"\b(gratitude|mood|journal\s+entry|today\s+i)\b", re.I),
        ],
        0.7,
    ),
]


class HeuristicDocumentClassifier:
    """Keyword / structure classifier. Default bias toward Trading for Harry OS."""

    name = "heuristic_classifier_v1"
    low_confidence_threshold = 0.55

    def classify(
        self,
        ocr_pages: list[OcrPageResult],
        *,
        options: PipelineOptions | None = None,
        forced_type: ParserType | str | None = None,
    ) -> ClassificationResult:
        if forced_type:
            pt = ParserType(forced_type) if isinstance(forced_type, str) else forced_type
            dest = {
                ParserType.TRADING: DestinationModule.TRADING,
                ParserType.BOOK: DestinationModule.BOOKS,
                ParserType.MEETING: DestinationModule.PLANNER,
                ParserType.FINANCE: DestinationModule.FINANCE,
                ParserType.HEALTH: DestinationModule.HEALTH,
                ParserType.GENERAL: DestinationModule.INBOX,
            }.get(pt, DestinationModule.INBOX)
            return ClassificationResult(
                parser_type=pt,
                confidence=1.0,
                reasons=["forced_by_caller"],
                destination=dest,
            )

        text = "\n".join(p.transcript or "" for p in ocr_pages)
        title_blob = " ".join(
            filter(
                None,
                [
                    options.title if options else None,
                    options.notebook_label if options else None,
                ],
            )
        )
        blob = f"{title_blob}\n{text}"

        scores: dict[str, float] = {}
        reasons: dict[str, list[str]] = {}
        for parser_type, _dest, patterns, weight in _RULES:
            hits = [p.pattern for p in patterns if p.search(blob)]
            if not hits:
                continue
            score = min(0.98, (len(hits) / len(patterns)) * weight)
            scores[parser_type.value] = score
            reasons[parser_type.value] = hits

        if not scores:
            # Harry OS default: handwritten notebook imports are Trading unless clearly otherwise
            return ClassificationResult(
                parser_type=ParserType.TRADING,
                confidence=0.45,
                reasons=["default_trading_bias", "no_strong_signals"],
                destination=DestinationModule.TRADING,
                raw_scores={},
            )

        best_key = max(scores, key=scores.get)  # type: ignore[arg-type]
        best_type = ParserType(best_key)
        conf = scores[best_key]
        dest = next(d for t, d, *_ in _RULES if t == best_type)

        if conf < self.low_confidence_threshold:
            return ClassificationResult(
                parser_type=ParserType.GENERAL,
                confidence=conf,
                reasons=[f"low_confidence_best={best_key}"] + reasons.get(best_key, []),
                destination=DestinationModule.INBOX,
                raw_scores=scores,
            )

        return ClassificationResult(
            parser_type=best_type,
            confidence=conf,
            reasons=reasons.get(best_key, []),
            destination=dest,
            raw_scores=scores,
        )
