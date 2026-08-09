"""Stage 3 — AI understanding: OCR pages → trading-journal markdown."""

from __future__ import annotations

import re
from datetime import date

from app.modules.ai.imports.pipeline.types import (
    OcrPageResult,
    PipelineOptions,
    UnderstandingResult,
)

_ISO_DATE = re.compile(r"\b(20\d{2}-\d{2}-\d{2})\b")
_FLEX_DATE = re.compile(
    r"(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|"
    r"October|November|December)\s+(\d{4})",
    re.I,
)
_SLASH_DATE = re.compile(
    r"\b(\d{1,2})\s*/\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
    r"jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
    r"\s*/\s*(\d{4})\b",
    re.I,
)
_NUMERIC_SLASH = re.compile(r"\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b")
_TRADE_HINT = re.compile(r"\btrade\s*#?\s*(\d+)\b", re.I)
_INSTRUMENT = re.compile(
    r"\b(NIFTY|BANKNIFTY|FINNIFTY|SENSEX|MIDCPNIFTY)(?:\s+(\d{4,5}))?\s*(CE|PE)?\b",
    re.I,
)
_RESULT = re.compile(r"\b(win|loss|breakeven|be|target|sl\s*hit)\b", re.I)
_PNL = re.compile(r"(?:pnl|p/?l|profit|loss)\s*[:=]?\s*([+\-]?\d[\d,]*(?:\.\d+)?)", re.I)
_QTY = re.compile(r"(?:qty|quantity|lots?)\s*[:=]?\s*(\d+(?:\.\d+)?)", re.I)
_ENTRY = re.compile(r"(?:entry)\s*[:=]?\s*(\d+(?:\.\d+)?)", re.I)
_EXIT = re.compile(r"(?:exit)\s*[:=]?\s*(\d+(?:\.\d+)?)", re.I)
_GRADE = re.compile(r"\bgrade\s*[:=]?\s*([A-F][+\-]?)\b", re.I)
_BIAS = re.compile(r"\b(bullish|bearish|neutral|range)\b", re.I)


def _month_num(name: str) -> int:
    months = {
        "january": 1,
        "jan": 1,
        "february": 2,
        "feb": 2,
        "march": 3,
        "mar": 3,
        "april": 4,
        "apr": 4,
        "may": 5,
        "june": 6,
        "jun": 6,
        "july": 7,
        "jul": 7,
        "august": 8,
        "aug": 8,
        "september": 9,
        "sept": 9,
        "sep": 9,
        "october": 10,
        "oct": 10,
        "november": 11,
        "nov": 11,
        "december": 12,
        "dec": 12,
    }
    return months[name.lower()]


def _detect_date(text: str) -> date | None:
    m = _ISO_DATE.search(text)
    if m:
        try:
            y, mo, d = m.group(1).split("-")
            return date(int(y), int(mo), int(d))
        except ValueError:
            pass
    m = _FLEX_DATE.search(text)
    if m:
        try:
            return date(int(m.group(3)), _month_num(m.group(2)), int(m.group(1)))
        except ValueError:
            pass
    m = _SLASH_DATE.search(text)
    if m:
        try:
            return date(int(m.group(3)), _month_num(m.group(2)), int(m.group(1)))
        except ValueError:
            pass
    m = _NUMERIC_SLASH.search(text)
    if m:
        try:
            # Prefer D/M/Y for notebook style (11/05/2026)
            d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if mo > 12 and d <= 12:
                d, mo = mo, d
            return date(y, mo, d)
        except ValueError:
            pass
    return None


def _extract_learning(text: str) -> str | None:
    m = re.search(
        r"(?:today'?s?\s+learn(?:ing)?|daily\s+learn(?:ing)?|learning\s*is)\s*[:→\-]*\s*(.+)",
        text,
        re.I | re.S,
    )
    if not m:
        return None
    chunk = m.group(1).strip()
    # Stop at next numbered section if present
    chunk = re.split(r"\n\s*(?:\d+\s+|#{1,3}\s+)", chunk, maxsplit=1)[0].strip()
    return chunk[:1200] if chunk else None


def _looks_like_journal_markdown(text: str) -> bool:
    lower = text.lower()
    signals = 0
    if re.search(r"^#\s+", text, re.M):
        signals += 1
    if "trade 1" in lower or re.search(r"#\s*trade\s+\d+", lower):
        signals += 2
    if "market context" in lower or "pre-market" in lower or "trading plan" in lower:
        signals += 1
    if "📅" in text or re.search(r"\bdate\s*:", lower):
        signals += 1
    return signals >= 2


def _extract_instrument(text: str) -> str | None:
    m = _INSTRUMENT.search(text)
    if not m:
        return None
    parts = [m.group(1).upper()]
    if m.group(2):
        parts.append(m.group(2))
    if m.group(3):
        parts.append(m.group(3).upper())
    return " ".join(parts)


class HeuristicUnderstandingEngine:
    """Deterministic 'AI understanding' without an LLM call.

    Turns OCR page transcripts into markdown shaped for `parse_trading_journal`.
    Swap for a vision/LLM engine later via the same port.
    """

    name = "heuristic_understanding_v1"

    async def understand(
        self,
        ocr_pages: list[OcrPageResult],
        *,
        options: PipelineOptions,
    ) -> UnderstandingResult:
        warnings: list[str] = []
        combined = "\n\n".join(
            f"### Page {p.page_index + 1}\n{p.transcript}".strip()
            for p in ocr_pages
            if p.transcript.strip()
        ).strip()

        if not combined:
            warnings.append("No OCR text available — generated review scaffold markdown")
            md = self._scaffold_markdown(options, ocr_pages, body=None)
            return UnderstandingResult(
                markdown=md,
                engine=self.name,
                notes="empty_ocr_scaffold",
                warnings=warnings,
            )

        if _looks_like_journal_markdown(combined):
            # OCR already resembles structured journal notes — pass through with light header.
            title = options.title or options.notebook_label or "Notebook import"
            journal_date = options.journal_date or _detect_date(combined) or date.today()
            header = f"# {title}\n\n📅 Date: {journal_date.isoformat()}\n\n"
            return UnderstandingResult(
                markdown=header + combined,
                engine=self.name,
                notes="passthrough_structured_ocr",
                page_hints={p.page_id: p.transcript[:200] for p in ocr_pages},
            )

        md = self._synthesize_markdown(options, ocr_pages, combined)
        warnings.append(
            "OCR was unstructured — heuristic engine synthesized trading-journal markdown"
        )
        return UnderstandingResult(
            markdown=md,
            engine=self.name,
            notes="heuristic_synthesis",
            page_hints={p.page_id: p.transcript[:200] for p in ocr_pages},
            warnings=warnings,
        )

    def _scaffold_markdown(
        self,
        options: PipelineOptions,
        ocr_pages: list[OcrPageResult],
        *,
        body: str | None,
    ) -> str:
        title = options.title or options.notebook_label or "Notebook import"
        journal_date = options.journal_date or date.today()
        lines = [
            f"# {title}",
            "",
            f"📅 Date: {journal_date.isoformat()}",
            "",
            "## Market Context",
            "",
            body
            or (
                "Handwritten notebook pages uploaded. "
                "Structured fields require human review or a vision model."
            ),
            "",
            "## Uncategorized",
            "",
        ]
        for p in ocr_pages:
            lines.append(f"- Page {p.page_index + 1}: {p.file_name or p.page_id}")
        return "\n".join(lines).strip() + "\n"

    def _synthesize_markdown(
        self,
        options: PipelineOptions,
        ocr_pages: list[OcrPageResult],
        combined: str,
    ) -> str:
        title = options.title or options.notebook_label or "Notebook import"
        # Prefer date written on the page over upload/filename hints
        journal_date = _detect_date(combined) or options.journal_date or date.today()
        bias_m = _BIAS.search(combined)
        grade_m = _GRADE.search(combined)
        instrument = _extract_instrument(combined)

        # Split rough trade blocks by "Trade N" markers; else one synthetic trade if instrument found
        trade_splits = list(_TRADE_HINT.finditer(combined))
        trade_bodies: list[tuple[int, str]] = []
        if trade_splits:
            for i, match in enumerate(trade_splits):
                start = match.start()
                end = trade_splits[i + 1].start() if i + 1 < len(trade_splits) else len(combined)
                idx = int(match.group(1))
                trade_bodies.append((idx, combined[start:end].strip()))
        elif instrument:
            trade_bodies.append((1, combined))

        lines: list[str] = [
            f"# {title}",
            "",
            f"📅 Date: {journal_date.isoformat()}",
            "",
            "## Market Context",
            "",
        ]
        # Day-level prose = text before first trade marker, or full OCR when unstructured
        if trade_splits:
            day_text = combined[: trade_splits[0].start()].strip()
        else:
            day_text = combined
        # Prefer real OCR body over placeholders
        cleaned_day = day_text.strip()
        if cleaned_day.startswith("[filename]") and len(cleaned_day) < 120:
            lines.append(
                "OCR could not read this notebook clearly. "
                "Check Original images and edit sections manually."
            )
        else:
            lines.append(cleaned_day or "Imported from notebook OCR.")
        if bias_m:
            lines.extend(["", f"- **Bias**: {bias_m.group(1).title()}"])
        if grade_m:
            lines.extend(["", f"**Overall Grade**: {grade_m.group(1).upper()}"])

        lines.extend(
            [
                "",
                "## Daily Learning",
                "",
            ]
        )
        learning = _extract_learning(combined)
        lines.append(
            learning
            or "Review extracted notebook text below and correct anything OCR missed."
        )
        lines.append("")

        for idx, body in trade_bodies:
            lines.extend([f"# Trade {idx}", ""])
            inst = _extract_instrument(body) or instrument
            if inst:
                lines.append(f"- **Instrument**: {inst}")
            qty = _QTY.search(body)
            entry = _ENTRY.search(body)
            exit_ = _EXIT.search(body)
            result = _RESULT.search(body)
            pnl = _PNL.search(body)
            if qty:
                lines.append(f"- **Quantity**: {qty.group(1)}")
            if entry:
                lines.append(f"- **Entry**: {entry.group(1)}")
            if exit_:
                lines.append(f"- **Exit**: {exit_.group(1)}")
            if result:
                lines.append(f"- **Result**: {result.group(1)}")
            if pnl:
                lines.append(f"- **PnL**: {pnl.group(1)}")
            lines.extend(
                [
                    "",
                    "## Trade Setup",
                    "",
                    body[:2500],
                    "",
                    "## Analysis",
                    "",
                    "Auto-extracted from notebook OCR — verify before save.",
                    "",
                ]
            )

        # Always keep a full OCR dump so Review shows what was read from the photos
        lines.extend(
            [
                "## OCR Transcript",
                "",
                "Raw text extracted from notebook page images:",
                "",
            ]
        )
        for p in ocr_pages:
            lines.append(f"#### Page {p.page_index + 1}")
            lines.append("")
            lines.append((p.transcript or "").strip() or "_(empty — OCR found no text)_")
            lines.append("")

        return "\n".join(lines).strip() + "\n"


async def run_understanding(
    ocr_pages: list[OcrPageResult],
    *,
    options: PipelineOptions,
    engine: HeuristicUnderstandingEngine | None = None,
) -> UnderstandingResult:
    eng = engine or HeuristicUnderstandingEngine()
    return await eng.understand(ocr_pages, options=options)
