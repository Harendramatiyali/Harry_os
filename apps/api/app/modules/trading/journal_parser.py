"""Parse Obsidian trading-journal markdown into structured day / trade sections.

Preserves full raw markdown. Unmatched blocks land in uncategorized / OTHER.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from app.modules.trading.journal_models import (
    DaySectionKey,
    JournalParseStatus,
    TradeSectionKey,
)
from app.modules.trading.models import TradeDirection

_HEADING_RE = re.compile(r"^(#{1,4})\s+(.+?)\s*$")
_TRADE_RE = re.compile(r"(?:📈\s*)?trade\s+(\d+)\b", re.I)
_WIKILINK_IMG_RE = re.compile(r"!\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]")
_DATE_LINE_RE = re.compile(
    r"(?:📅\s*)?(?:\*\*)?date(?:\*\*)?\s*[:\-]\s*(?:\*\*)?(.+?)(?:\*\*)?\s*$",
    re.I | re.M,
)
_DATE_FLEX_RE = re.compile(
    r"(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})",
    re.I,
)
_ISO_DATE_RE = re.compile(r"\b(20\d{2}-\d{2}-\d{2})\b")
_DQS_TOTAL_RE = re.compile(r"total\s*:\s*(\d+)\s*/\s*(\d+)", re.I)
_BULLET_FIELD_RE = re.compile(
    # Keep value on the same line — do not let \s eat the following bullet.
    r"^[-*]\s+\*\*([^*]+?)\*\*[ \t]*(.*?)\s*$",
    re.M,
)
_PLAIN_FIELD_RE = re.compile(
    r"^[-*]?\s*\*\*(Entry|Exit|Final\s+Exit|Partial\s+Exit|Quantity|Result|Stop(?:\s*Loss)?|Instrument|Setup(?:\s*Type)?)\*\*[ \t]*[:\-]?\s*(.+?)\s*$",
    re.I | re.M,
)
_FILL_RE = re.compile(
    r"(?P<qty>\d+(?:\.\d+)?)\s*(?:quantity|qty|lots?)?\s*@\s*[₹$]?\s*(?P<px>\d+(?:\.\d+)?)",
    re.I,
)


def _strip_md(text: str) -> str:
    t = text.strip()
    t = re.sub(r"[*_`~]", "", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def _normalize_heading(heading: str) -> str:
    t = _strip_md(heading)
    # Drop leading emoji / symbols for matching
    t = re.sub(r"^[^A-Za-z0-9]+", "", t)
    t = t.lower().strip()
    t = re.sub(r"[^\w\s/\-]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


# Longer / more specific aliases first within each group.
_DAY_ALIASES: list[tuple[str, DaySectionKey]] = [
    ("market overview", DaySectionKey.MARKET_CONTEXT),
    ("market context", DaySectionKey.MARKET_CONTEXT),
    ("pre-market analysis", DaySectionKey.PRE_MARKET),
    ("pre market analysis", DaySectionKey.PRE_MARKET),
    ("pre-market", DaySectionKey.PRE_MARKET),
    ("pre market", DaySectionKey.PRE_MARKET),
    ("initial trading plan", DaySectionKey.TRADING_PLAN),
    ("trading plan", DaySectionKey.TRADING_PLAN),
    ("intraday market observation", DaySectionKey.INTRADAY_OBSERVATION),
    ("intraday observation", DaySectionKey.INTRADAY_OBSERVATION),
    ("market observation", DaySectionKey.MARKET_OBSERVATION),
    ("daily learning", DaySectionKey.DAILY_LEARNING),
    ("books learning", DaySectionKey.DAILY_LEARNING),
    ("books & learning", DaySectionKey.DAILY_LEARNING),
    ("what went well today", DaySectionKey.WHAT_WENT_WELL),
    ("what went well", DaySectionKey.WHAT_WENT_WELL),
    ("biggest wins", DaySectionKey.WHAT_WENT_WELL),
    ("wins", DaySectionKey.WHAT_WENT_WELL),
    ("today s mistakes", DaySectionKey.MISTAKES),
    ("todays mistakes", DaySectionKey.MISTAKES),
    ("mistakes", DaySectionKey.MISTAKES),
    ("opportunity missed", DaySectionKey.LESSONS),
    ("key learnings", DaySectionKey.LESSONS),
    ("biggest lesson", DaySectionKey.LESSONS),
    ("biggest learning", DaySectionKey.LESSONS),
    ("lessons", DaySectionKey.LESSONS),
    ("htj rules reinforced", DaySectionKey.RULES_REINFORCED),
    ("rules reinforced", DaySectionKey.RULES_REINFORCED),
    ("tomorrow s focus", DaySectionKey.ACTION_ITEMS),
    ("tomorrows focus", DaySectionKey.ACTION_ITEMS),
    ("action plan", DaySectionKey.ACTION_ITEMS),
    ("focus for next week", DaySectionKey.ACTION_ITEMS),
    ("next improvement target", DaySectionKey.ACTION_ITEMS),
    ("iq-200 daily evaluation", DaySectionKey.IQ200_EVALUATION),
    ("iq 200 daily evaluation", DaySectionKey.IQ200_EVALUATION),
    ("iq-200 verdict", DaySectionKey.IQ200_EVALUATION),
    ("iq 200 verdict", DaySectionKey.IQ200_EVALUATION),
    ("iq-200 evaluation", DaySectionKey.IQ200_EVALUATION),
    ("today s biggest improvement", DaySectionKey.IQ200_EVALUATION),
    ("todays biggest improvement", DaySectionKey.IQ200_EVALUATION),
    ("biggest bottleneck", DaySectionKey.IQ200_EVALUATION),
    ("trade quality", DaySectionKey.IQ200_EVALUATION),
    ("closing note", DaySectionKey.CLOSING_NOTE),
    ("final thought", DaySectionKey.CLOSING_NOTE),
    ("iq-200 closing note", DaySectionKey.CLOSING_NOTE),
    ("personal reflection", DaySectionKey.PSYCHOLOGY),
    ("health review", DaySectionKey.PSYCHOLOGY),
    ("career review", DaySectionKey.PSYCHOLOGY),
    ("psychology", DaySectionKey.PSYCHOLOGY),
    ("daily rating", DaySectionKey.OTHER),
    ("overall grade", DaySectionKey.OTHER),
    ("overall htj grade", DaySectionKey.OTHER),
    ("daily performance summary", DaySectionKey.OTHER),
    ("trading review", DaySectionKey.OTHER),
]


_TRADE_ALIASES: list[tuple[str, TradeSectionKey]] = [
    ("trade thesis", TradeSectionKey.ENTRY_LOGIC),
    ("entry logic", TradeSectionKey.ENTRY_LOGIC),
    ("what happened", TradeSectionKey.TRADE_MANAGEMENT),
    ("trade management", TradeSectionKey.TRADE_MANAGEMENT),
    ("exit", TradeSectionKey.EXIT),
    ("final analysis", TradeSectionKey.ANALYSIS),
    ("analysis", TradeSectionKey.ANALYSIS),
    ("what went well", TradeSectionKey.WHAT_WENT_WELL),
    ("mistakes", TradeSectionKey.MISTAKES),
    ("root cause", TradeSectionKey.ROOT_CAUSE),
    ("next time i ll do", TradeSectionKey.NEXT_TIME),
    ("next time i'll do", TradeSectionKey.NEXT_TIME),
    ("next time", TradeSectionKey.NEXT_TIME),
    ("instrument", TradeSectionKey.TRADE_SETUP),
    ("trade details", TradeSectionKey.TRADE_SETUP),
    ("setup type", TradeSectionKey.TRADE_SETUP),
    ("strategy", TradeSectionKey.TRADE_SETUP),
    ("trade quality", TradeSectionKey.TRADE_SETUP),
    ("trade grade", TradeSectionKey.TRADE_SETUP),
    ("decision quality score", TradeSectionKey.TRADE_SETUP),
    ("dqs", TradeSectionKey.TRADE_SETUP),
]


_SKIP_DAY_HEADINGS = {
    "date",
    "harendra trading journal htj v2 0",
    "harendra trading journal htj v2 1",
    "harendra trading journal",
}


@dataclass
class ParsedAttachment:
    obsidian_ref: str
    file_name: str
    caption: str | None = None


@dataclass
class ParsedSection:
    section_key: str
    heading_original: str | None
    body_markdown: str
    sort_order: int
    mapped: bool = True


@dataclass
class ParsedTrade:
    trade_index: int
    title_suffix: str | None
    raw_markdown: str
    instrument: str | None = None
    direction: TradeDirection | None = None
    quantity: Decimal | None = None
    entry_price: Decimal | None = None
    exit_price: Decimal | None = None
    stop_price: Decimal | None = None
    stop_points: Decimal | None = None
    result: str | None = None
    pnl: Decimal | None = None
    setup: str | None = None
    grade: str | None = None
    dqs_score: int | None = None
    dqs_max: int | None = None
    sections: list[ParsedSection] = field(default_factory=list)
    attachments: list[ParsedAttachment] = field(default_factory=list)
    # (qty, price) fills from Partial/Final Exit lines — used for weighted exit
    fills: list[tuple[Decimal, Decimal]] = field(default_factory=list)


@dataclass
class ParsedDayJournal:
    journal_date: date | None
    title: str | None
    raw_markdown: str
    market: str | None = None
    primary_instrument: str | None = None
    day_bias: str | None = None
    day_result: str | None = None
    day_pnl: Decimal | None = None
    daily_rating: Decimal | None = None
    overall_grade: str | None = None
    tags_csv: str | None = None
    sections: list[ParsedSection] = field(default_factory=list)
    trades: list[ParsedTrade] = field(default_factory=list)
    attachments: list[ParsedAttachment] = field(default_factory=list)
    uncategorized_markdown: str | None = None
    parse_status: JournalParseStatus = JournalParseStatus.NEEDS_REVIEW
    warnings: list[str] = field(default_factory=list)
    is_weekly_review: bool = False


@dataclass
class _Block:
    level: int
    heading: str
    body: str
    start: int


def is_weekly_review_note(*, title: str | None, body: str, vault_path: str | None = None) -> bool:
    blob = " ".join(
        filter(
            None,
            [
                (title or "").lower(),
                (vault_path or "").lower(),
                (body or "")[:400].lower(),
            ],
        )
    )
    if "weekly review" in blob:
        return True
    if re.search(r"\bweek\s*:\s*", (body or "")[:300], re.I) and not _TRADE_RE.search(body or ""):
        return True
    return False


def parse_trading_journal(
    markdown: str,
    *,
    fallback_date: date | None = None,
    title_hint: str | None = None,
) -> ParsedDayJournal:
    raw = markdown or ""
    result = ParsedDayJournal(
        journal_date=fallback_date,
        title=title_hint,
        raw_markdown=raw,
        is_weekly_review=is_weekly_review_note(title=title_hint, body=raw),
    )
    if result.is_weekly_review:
        result.warnings.append("Detected weekly review — skip structured day-journal migrate")
        result.parse_status = JournalParseStatus.NEEDS_REVIEW
        return result

    if not raw.strip():
        result.warnings.append("Empty markdown")
        return result

    blocks = _split_blocks(raw)
    trade_idxs = [i for i, b in enumerate(blocks) if _TRADE_RE.search(_normalize_heading(b.heading) or b.heading)]

    day_blocks: list[_Block] = []
    trade_groups: list[tuple[_Block, list[_Block]]] = []

    if not trade_idxs:
        day_blocks = blocks
    else:
        day_blocks = blocks[: trade_idxs[0]]
        for gi, start_i in enumerate(trade_idxs):
            end_i = trade_idxs[gi + 1] if gi + 1 < len(trade_idxs) else len(blocks)
            head = blocks[start_i]
            children = blocks[start_i + 1 : end_i]
            # Nested ### under a trade stay as children; sibling # sections after trades
            # that are NOT trades belong to day — handled by end_i next trade or remainder.
            trade_groups.append((head, children))
        # Trailing day sections after last trade: children of last trade may include
        # top-level day headings. Split those out if level <= trade heading level and not trade.
        if trade_groups:
            last_head, last_children = trade_groups[-1]
            split_at: int | None = None
            for i, ch in enumerate(last_children):
                # Day epilogue resumes at same/higher heading level as Trade N (usually #)
                if ch.level <= last_head.level and not _TRADE_RE.search(ch.heading):
                    split_at = i
                    break
            if split_at is not None:
                trade_groups[-1] = (last_head, last_children[:split_at])
                day_blocks.extend(last_children[split_at:])

    # Preamble before first heading
    preamble = _preamble(raw, blocks)
    if preamble.strip():
        result.uncategorized_markdown = preamble.strip()

    # Header / date
    parsed_date = _extract_date(raw)
    if parsed_date and result.journal_date is None:
        result.journal_date = parsed_date
    elif parsed_date and result.journal_date and parsed_date != result.journal_date:
        result.warnings.append(
            f"Date mismatch: filename/fallback {result.journal_date} vs body {parsed_date} — using fallback"
        )

    if not result.title:
        result.title = _infer_title(raw, result.journal_date)

    # Day sections (# / ##); ###+ nest inside parent body
    sort = 0
    for block, body in _group_by_section_level(day_blocks, section_max_level=2):
        norm = _normalize_heading(block.heading)
        if (
            norm in _SKIP_DAY_HEADINGS
            or norm.startswith("harendra trading journal")
            or norm.startswith("date")
            or "date" == norm
        ):
            _extract_day_fields_from_text(result, body)
            continue
        key = _map_day_key(norm)
        mapped = key is not None
        if key is None:
            key = DaySectionKey.UNCATEGORIZED
            result.warnings.append(f"Unmapped day heading: {block.heading}")
        body_clean = body.strip("\n")
        result.sections.append(
            ParsedSection(
                section_key=key.value,
                heading_original=block.heading,
                body_markdown=body_clean,
                sort_order=sort,
                mapped=mapped,
            )
        )
        sort += 1
        _extract_day_fields_from_text(result, f"{block.heading}\n{body_clean}")
        for att in _extract_attachments(body_clean):
            result.attachments.append(att)

    if result.uncategorized_markdown:
        for att in _extract_attachments(result.uncategorized_markdown):
            result.attachments.append(att)

    # Trades
    for head, children in trade_groups:
        trade = _parse_trade(head, children)
        _finalize_trade_pnl(trade)
        result.trades.append(trade)
        if trade.instrument and not result.primary_instrument:
            result.primary_instrument = trade.instrument

    pnls = [t.pnl for t in result.trades if t.pnl is not None]
    if pnls:
        result.day_pnl = sum(pnls, Decimal("0"))

    result.parse_status = _compute_status(result)
    return result


def _group_by_section_level(blocks: list[_Block], section_max_level: int) -> list[tuple[_Block, str]]:
    """Collapse nested headings into parent body. New section when level <= section_max_level."""
    grouped: list[tuple[_Block, str]] = []
    i = 0
    while i < len(blocks):
        block = blocks[i]
        if block.level > section_max_level:
            # Orphan deep heading — keep as its own section so nothing is lost
            body = block.body
            i += 1
            while i < len(blocks) and blocks[i].level > block.level:
                child = blocks[i]
                body += f"{'#' * child.level} {child.heading}\n{child.body}"
                i += 1
            grouped.append((block, body))
            continue

        body = block.body
        i += 1
        while i < len(blocks) and blocks[i].level > section_max_level:
            child = blocks[i]
            body += f"{'#' * child.level} {child.heading}\n{child.body}"
            i += 1
            # Also nest even deeper under this child already included as text;
            # the while only consumes level > section_max_level sequentially.
            # Children of child with deeper level are still > section_max_level so continue.
        grouped.append((block, body))
    return grouped


def _map_day_key(norm: str) -> DaySectionKey | None:
    for alias, key in _DAY_ALIASES:
        if norm == alias or norm.startswith(alias + " ") or alias in norm:
            # Prefer exact / startswith; "in norm" can false-positive — require alias word-ish
            if norm == alias or norm.startswith(alias):
                return key
    for alias, key in _DAY_ALIASES:
        if alias in norm:
            return key
    return None


def _map_trade_key(norm: str) -> TradeSectionKey | None:
    for alias, key in _TRADE_ALIASES:
        if norm == alias or norm.startswith(alias):
            return key
    for alias, key in _TRADE_ALIASES:
        if alias in norm:
            return key
    return None


def _split_blocks(markdown: str) -> list[_Block]:
    lines = markdown.splitlines(keepends=True)
    headings: list[tuple[int, int, str, int]] = []  # line_idx, level, heading, char_start
    char = 0
    for i, line in enumerate(lines):
        m = _HEADING_RE.match(line.rstrip("\n"))
        if m:
            headings.append((i, len(m.group(1)), m.group(2).strip(), char))
        char += len(line)

    if not headings:
        return []

    blocks: list[_Block] = []
    for hi, (line_i, level, heading, start) in enumerate(headings):
        if hi + 1 < len(headings):
            end_line = headings[hi + 1][0]
        else:
            end_line = len(lines)
        body = "".join(lines[line_i + 1 : end_line])
        blocks.append(_Block(level=level, heading=heading, body=body, start=start))
    return blocks


def _preamble(markdown: str, blocks: list[_Block]) -> str:
    if not blocks:
        return markdown
    return markdown[: blocks[0].start]


def _extract_date(text: str) -> date | None:
    m = _ISO_DATE_RE.search(text)
    if m:
        try:
            return date.fromisoformat(m.group(1))
        except ValueError:
            pass
    m = _DATE_LINE_RE.search(text)
    candidate = m.group(1) if m else None
    if not candidate:
        m2 = _DATE_FLEX_RE.search(text)
        if m2:
            candidate = m2.group(0)
    if not candidate:
        return None
    candidate = _strip_md(candidate)
    candidate = re.sub(r"\([^)]*\)", "", candidate).strip()
    for fmt in ("%d %B %Y", "%d %b %Y", "%B %d, %Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(candidate, fmt).date()
        except ValueError:
            continue
    m2 = _DATE_FLEX_RE.search(candidate)
    if m2:
        try:
            return datetime.strptime(m2.group(0), "%d %B %Y").date()
        except ValueError:
            try:
                return datetime.strptime(m2.group(0), "%d %b %Y").date()
            except ValueError:
                return None
    return None


def _infer_title(raw: str, journal_date: date | None) -> str | None:
    for line in raw.splitlines()[:15]:
        m = _HEADING_RE.match(line.strip())
        if m:
            h = _strip_md(m.group(2))
            if h and not h.lower().startswith("date"):
                return h[:255]
    if journal_date:
        return f"Trading Journal {journal_date.isoformat()}"
    return None


def _parse_trade(head: _Block, children: list[_Block]) -> ParsedTrade:
    m = _TRADE_RE.search(head.heading)
    idx = int(m.group(1)) if m else 1
    suffix = None
    paren = re.search(r"\(([^)]+)\)", head.heading)
    if paren:
        suffix = paren.group(1).strip()

    raw_parts = [f"{'#' * head.level} {head.heading}\n{head.body}"]
    for ch in children:
        raw_parts.append(f"{'#' * ch.level} {ch.heading}\n{ch.body}")
    raw = "".join(raw_parts).strip("\n")

    trade = ParsedTrade(trade_index=idx, title_suffix=suffix, raw_markdown=raw)

    # Head body may contain early instrument lines / images
    _extract_trade_fields(trade, head.body)
    for att in _extract_attachments(head.body):
        trade.attachments.append(att)

    sort = 0
    # ## / ### trade subsections; deeper nests inside
    for block, body in _group_by_section_level(children, section_max_level=3):
        norm = _normalize_heading(block.heading)
        if norm.startswith("total ") or re.match(r"^total\s+\d+", norm):
            _extract_trade_fields(trade, f"{block.heading}\n{body}")
            continue
        key = _map_trade_key(norm)
        mapped = key is not None
        if key is None:
            key = TradeSectionKey.UNCATEGORIZED
        body_clean = body.strip("\n")
        trade.sections.append(
            ParsedSection(
                section_key=key.value,
                heading_original=block.heading,
                body_markdown=body_clean,
                sort_order=sort,
                mapped=mapped,
            )
        )
        sort += 1
        _extract_trade_fields(trade, f"{block.heading}\n{body_clean}")
        for att in _extract_attachments(body_clean):
            trade.attachments.append(att)

    return trade


def _extract_attachments(text: str) -> list[ParsedAttachment]:
    out: list[ParsedAttachment] = []
    for m in _WIKILINK_IMG_RE.finditer(text or ""):
        ref = m.group(1).strip()
        name = ref.split("/")[-1]
        out.append(ParsedAttachment(obsidian_ref=ref, file_name=name))
    return out


def _to_decimal(value: str) -> Decimal | None:
    """Parse the first sensible number from free text.

    Important: do NOT strip all non-digits into one blob — that turns
    "Above 163 (Executed around 167)" into 163167 and ruins P&L.
    """
    cleaned = value.strip().replace(",", "")
    cleaned = re.sub(r"[₹$]", "", cleaned)
    if not cleaned:
        return None

    # Prefer "executed around X" / "around X" when present (actual fill).
    around = re.search(
        r"(?:executed\s+)?around\s+(-?\d+(?:\.\d+)?)",
        cleaned,
        re.I,
    )
    if around:
        try:
            return Decimal(around.group(1))
        except InvalidOperation:
            pass

    # Otherwise take the first standalone number (not concatenated digits).
    first = re.search(r"-?\d+(?:\.\d+)?", cleaned)
    if not first:
        return None
    try:
        return Decimal(first.group(0))
    except InvalidOperation:
        return None


def _compose_index_option(index: str | None, option: str | None) -> str | None:
    """Build 'NIFTY 24600 PE' from separate Index / Option bullets."""
    idx = (index or "").strip()
    opt = (option or "").strip()
    if idx and opt:
        return f"{idx} {opt}"[:64]
    if opt and re.search(r"\b(CE|PE)\b", opt, re.I):
        return opt[:64]
    if idx and re.search(r"\b(CE|PE)\b", idx, re.I):
        return idx[:64]
    return None


def _looks_like_contract(text: str) -> bool:
    t = text.strip()
    if not t or len(t) > 64:
        return False
    if re.search(r"\b(CE|PE)\b", t):
        return True
    return bool(
        re.search(r"\b(nifty|banknifty|sensex|finnifty)\b", t, re.I)
        and re.search(r"\d{4,}", t)
    )


def _extract_trade_fields(trade: ParsedTrade, text: str) -> None:
    if not text:
        return

    # Collect Index/Option split fields used in HTJ v2 Instrument sections.
    index_name: str | None = None
    option_name: str | None = None

    # Bold instrument line: **NIFTY 24200 CE** (full contract in one bold span)
    if not trade.instrument:
        for m in re.finditer(r"\*\*([^*]+)\*\*", text):
            cand = m.group(1).strip().rstrip(":").strip()
            if _looks_like_contract(cand):
                trade.instrument = cand[:64]
                break
        if not trade.instrument:
            # Require a real colon/dash field — do NOT treat "Instrument\n- bullet" as a match
            # (the bullet dash used to be swallowed as the separator).
            m = re.search(
                r"(?:^|\n)\s*(?:instrument|symbol)\s*[:：]\s*(.+)$",
                text,
                re.I | re.M,
            )
            if m:
                cand = _strip_md(m.group(1))
                if _looks_like_contract(cand) or cand:
                    trade.instrument = cand[:64]

    # Bought CE/PE premiums are LONG for P&L. Only SHORT if explicitly sold/written.
    if trade.direction is None:
        if re.search(r"\b(sold|shorted|wrote|writing|sell)\b", text, re.I):
            trade.direction = TradeDirection.SHORT
        elif trade.instrument and re.search(r"\b(CE|PE)\b", trade.instrument):
            trade.direction = TradeDirection.LONG
        elif re.search(r"\blong\b", text, re.I):
            trade.direction = TradeDirection.LONG
        elif re.search(r"\bshort\b", text, re.I):
            trade.direction = TradeDirection.SHORT

    for m in _BULLET_FIELD_RE.finditer(text):
        key = m.group(1).strip().rstrip(":").strip()
        val = _strip_md(m.group(2) or "")
        if not val:
            # e.g. `- **NIFTY 24200 CE**` — instrument-only bullet
            if _looks_like_contract(key):
                if not trade.instrument:
                    trade.instrument = key[:64]
            continue
        key_l = key.lower()
        if key_l == "index":
            index_name = val
            continue
        if key_l == "option":
            option_name = val
            continue
        _assign_trade_field(trade, key, val)

    composed = _compose_index_option(index_name, option_name)
    if composed:
        # Prefer composed contract over a bad earlier capture like "Index: NIFTY"
        if (
            not trade.instrument
            or trade.instrument.lower().startswith("index:")
            or not re.search(r"\b(CE|PE)\b", trade.instrument)
        ):
            trade.instrument = composed

    for m in _PLAIN_FIELD_RE.finditer(text):
        _assign_trade_field(trade, m.group(1).lower(), _strip_md(m.group(2)))

    # Loose Entry/Qty lines inside instrument blobs
    for key, pattern in (
        ("entry", r"\bentry\s*[:\-]?\s*([0-9][0-9,]*(?:\.[0-9]+)?)"),
        ("quantity", r"\bquantity\s*[:\-]?\s*([0-9][0-9,]*(?:\.[0-9]+)?)"),
        ("exit", r"\b(?:final\s+)?exit\s*[:\-]?\s*([0-9][0-9,]*(?:\.[0-9]+)?)"),
        ("stop", r"\bstop(?:\s*loss)?\s*[:\-]?\s*(.+)$"),
    ):
        if key == "entry" and trade.entry_price is not None:
            continue
        if key == "exit" and trade.exit_price is not None:
            continue
        if key == "stop" and trade.stop_price is not None:
            continue
        if key == "quantity" and trade.quantity is not None:
            continue
        m = re.search(pattern, text, re.I | re.M)
        if m:
            _assign_trade_field(trade, key, m.group(1))

    # Prose quantity: "260 quantity" / "**260 quantity**" / "qty 260"
    if trade.quantity is None:
        qm = re.search(
            r"(?:increased\s+(?:my\s+)?position\s+size\s+to\s+|position\s+size\s+(?:of\s+|to\s+)?)?"
            r"[*]{0,2}(\d{2,5})[*]{0,2}\s*(?:quantity|qty|lots?)\b",
            text,
            re.I,
        )
        if not qm:
            qm = re.search(r"\b(?:qty|quantity|lots?)\s*(?:of\s+|[=:]\s*)?(\d{2,5})\b", text, re.I)
        if qm:
            trade.quantity = _to_decimal(qm.group(1))

    # Direction from composed PE/CE if still missing
    if trade.direction is None and trade.instrument and re.search(r"\b(CE|PE)\b", trade.instrument):
        trade.direction = TradeDirection.LONG

    m = re.search(r"\b(?:final\s+)?result\s*[:\-]\s*(.+)$", text, re.I | re.M)
    if m and not trade.result:
        trade.result = _strip_md(m.group(1))[:128]

    dqs = _DQS_TOTAL_RE.search(text)
    if dqs:
        trade.dqs_score = int(dqs.group(1))
        trade.dqs_max = int(dqs.group(2))

    grade = re.search(r"\b(?:trade\s+)?grade\s*[:\-]?\s*\**([A-F][+-]?|\d+)\**", text, re.I)
    if grade and not trade.grade:
        trade.grade = grade.group(1)[:4]

    setup = re.search(r"\bsetup(?:\s*type)?\s*[:\-]\s*(.+)$", text, re.I | re.M)
    if setup and not trade.setup:
        trade.setup = _strip_md(setup.group(1))[:128]


def _assign_trade_field(trade: ParsedTrade, key: str, val: str) -> None:
    key = key.lower().strip().rstrip(":").strip()
    if key in {"instrument", "symbol"} and not trade.instrument:
        trade.instrument = val[:64]
    elif key == "entry" and trade.entry_price is None:
        trade.entry_price = _to_decimal(val)
    elif key in {"exit", "final exit"} and trade.exit_price is None:
        fill = _FILL_RE.search(val)
        if fill:
            qty = Decimal(fill.group("qty"))
            px = Decimal(fill.group("px"))
            trade.fills.append((qty, px))
            if trade.exit_price is None:
                trade.exit_price = px
        else:
            trade.exit_price = _to_decimal(val)
    elif key == "partial exit":
        fill = _FILL_RE.search(val)
        if fill:
            trade.fills.append((Decimal(fill.group("qty")), Decimal(fill.group("px"))))
    elif key == "quantity" and trade.quantity is None:
        trade.quantity = _to_decimal(val)
    elif key.startswith("stop") and trade.stop_price is None and trade.stop_points is None:
        # "Approx. 29 Points" is a distance, not a premium price
        if "point" in val.lower():
            trade.stop_points = _to_decimal(val)
            return
        trade.stop_price = _to_decimal(val)
    elif key == "result" and not trade.result:
        trade.result = val[:128]
    elif key.startswith("setup") and not trade.setup:
        trade.setup = val[:128]


def _finalize_trade_pnl(trade: ParsedTrade) -> None:
    """Resolve weighted exits and store **rupee** P&L on the trade."""
    from app.modules.trading.journal_bridge import compute_journal_rupee_pnl, resolve_exit_price

    if trade.fills:
        notional = sum((q * p for q, p in trade.fills), Decimal("0"))
        total_qty = sum((q for q, _ in trade.fills), Decimal("0"))
        if total_qty > 0:
            trade.exit_price = (notional / total_qty).quantize(Decimal("0.0001"))
            if trade.quantity is None:
                trade.quantity = total_qty

    result_l = (trade.result or "").lower()
    sl_hit = any(k in result_l for k in ("stop loss", "sl hit", "trailing stop"))

    # Convert SL distance-in-points into an exit premium for bought options
    if (
        trade.exit_price is None
        and trade.entry_price is not None
        and trade.stop_points is not None
        and sl_hit
    ):
        trade.exit_price = trade.entry_price - trade.stop_points

    if trade.exit_price is None:
        resolved = resolve_exit_price(trade)
        if resolved is not None:
            trade.exit_price = resolved

    trade.pnl = compute_journal_rupee_pnl(trade)


def _extract_day_fields_from_text(result: ParsedDayJournal, text: str) -> None:
    bias = re.search(r"market\s+bias(?:\s*\([^)]*\))?\s*[:\-]\s*(.+)$", text, re.I | re.M)
    if bias and not result.day_bias:
        result.day_bias = _strip_md(bias.group(1))[:64]

    rating = re.search(r"daily\s+rating.*?(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)", text, re.I | re.S)
    if rating and result.daily_rating is None:
        try:
            result.daily_rating = Decimal(rating.group(1))
        except InvalidOperation:
            pass

    grade = re.search(r"overall(?:\s+htj)?\s+grade\s*[:\-]?\s*\**([A-F][+-]?)\**", text, re.I)
    if grade and not result.overall_grade:
        result.overall_grade = grade.group(1)[:4]

    # Standalone grade section body like **B**
    if not result.overall_grade and re.search(r"overall(?:\s+htj)?\s+grade", text, re.I):
        g2 = re.search(r"\*\*\s*([A-F][+-]?)\s*\*\*", text)
        if g2:
            result.overall_grade = g2.group(1)[:4]


def _compute_status(result: ParsedDayJournal) -> JournalParseStatus:
    if result.journal_date is None:
        return JournalParseStatus.NEEDS_REVIEW
    if not result.sections and not result.trades:
        return JournalParseStatus.NEEDS_REVIEW

    unmapped_day = sum(1 for s in result.sections if not s.mapped)
    unmapped_trade = sum(1 for t in result.trades for s in t.sections if not s.mapped)
    has_uncat = bool(result.uncategorized_markdown) or unmapped_day or unmapped_trade

    if has_uncat or result.warnings:
        # Still useful structure
        if result.trades or any(s.mapped for s in result.sections):
            return JournalParseStatus.PARTIAL
        return JournalParseStatus.NEEDS_REVIEW
    return JournalParseStatus.PARSED
