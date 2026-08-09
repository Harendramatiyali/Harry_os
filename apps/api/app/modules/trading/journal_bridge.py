"""M6 helpers: classify journal outcomes and map journal trades → ledger trades."""

from __future__ import annotations

import re
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Literal, Protocol

from app.modules.trading.journal_models import TradingJournalTrade

Outcome = Literal["win", "loss", "scratch", "unknown"]

_INSTRUMENT_PREFIX = re.compile(r"^(instrument\s*:?\s*)", re.I)
_POINTS = re.compile(
    r"(?P<sign>[+\-−–]?)\s*(?P<num>\d+(?:\.\d+)?)\s*-?\s*(?:premium\s+)?points?",
    re.I,
)
_EXIT_AT = re.compile(
    r"(?:stop\s*loss\s*hit|sl\s*hit|hit|at|around|~)\s*[:(]?\s*(?P<num>\d+(?:\.\d+)?)",
    re.I,
)


class JournalTradeLike(Protocol):
    instrument: str | None
    direction: Any
    quantity: Decimal | None
    entry_price: Decimal | None
    exit_price: Decimal | None
    stop_price: Decimal | None
    result: str | None
    pnl: Decimal | None


def clean_instrument(raw: str | None) -> str | None:
    if not raw or not raw.strip():
        return None
    text = _INSTRUMENT_PREFIX.sub("", raw.strip())
    text = re.sub(r"\s+", " ", text).strip()
    return text[:64] if text else None


def ledger_grade(raw: str | None) -> str | None:
    if not raw:
        return None
    letter = raw.strip().upper()[:1]
    return letter if letter in "ABCDEF" else None


def classify_outcome(trade: JournalTradeLike) -> Outcome:
    if trade.pnl is not None:
        if trade.pnl > 0:
            return "win"
        if trade.pnl < 0:
            return "loss"
        return "scratch"

    result = (trade.result or "").strip().lower()
    if not result:
        return "unknown"

    if any(k in result for k in ("profitable", "winner", "target hit", "booked profit", "profit booked")):
        return "win"
    if any(k in result for k in ("cost-to-cost", "cost to cost", "breakeven", "break even")):
        return "scratch"
    if any(k in result for k in ("stop loss", "sl hit", "stopped", "loser", "loss")):
        return "loss"

    m = _POINTS.search(result)
    if m:
        sign = m.group("sign") or ""
        if sign in ("-", "−", "–"):
            return "loss"
        if sign == "+":
            return "win"
        if result.lstrip().startswith(("-", "−", "–")):
            return "loss"

    if "early exit" in result:
        return "unknown"
    return "unknown"


def promote_ready(trade: TradingJournalTrade) -> tuple[bool, str | None]:
    """Return (ok, skip_reason)."""
    if trade.ledger_trade_id:
        return False, "already_linked"
    if not clean_instrument(trade.instrument):
        return False, "missing_instrument"
    if trade.direction is None:
        return False, "missing_direction"
    if trade.entry_price is None or trade.entry_price <= 0:
        return False, "missing_entry"
    return True, None


def points_from_result(result: str | None) -> Decimal | None:
    """Extract signed premium-points from a Result line."""
    if not result or not result.strip():
        return None
    text = result.strip()
    m = _POINTS.search(text)
    if not m:
        return None
    num = Decimal(m.group("num"))
    sign = m.group("sign") or ""
    if sign in ("-", "−", "–") or text.lstrip().startswith(("-", "−", "–")):
        return -num
    if sign == "+":
        return num
    lower = text.lower()
    if any(k in lower for k in ("loss", "stop loss", "sl hit", "stopped")):
        return -num
    if any(k in lower for k in ("profit", "winner", "booked")):
        return num
    return None


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def resolve_exit_price(trade: JournalTradeLike) -> Decimal | None:
    """Best exit premium: explicit exit, else SL price when SL hit, else price in result text."""
    if trade.exit_price is not None and trade.exit_price > 0:
        return trade.exit_price

    result = (trade.result or "").strip().lower()
    sl_hit = any(k in result for k in ("stop loss", "sl hit", "trailing stop"))

    if sl_hit and trade.stop_price is not None and trade.stop_price > 0:
        # Guard against parsed "points" mistakenly stored as tiny/huge stop prices
        entry = trade.entry_price
        if entry is not None and entry > 0:
            if Decimal("0.5") <= trade.stop_price <= entry * Decimal("3"):
                return trade.stop_price
        elif trade.stop_price >= 1:
            return trade.stop_price

    if result:
        m = _EXIT_AT.search(trade.result or "")
        if m:
            num = Decimal(m.group("num"))
            entry = trade.entry_price
            # Prefer prices in a realistic premium band near entry
            if entry is not None and entry > 0 and Decimal("0.5") <= num <= entry * Decimal("3"):
                return num
            if entry is None and num >= 1:
                return num
    return None


def compute_journal_rupee_pnl(trade: JournalTradeLike) -> Decimal | None:
    """Rupee P&L for bought option premiums: (exit − entry) × quantity.

    Falls back to signed premium-points × quantity when prices are incomplete.
    Cost-to-cost / breakeven → ₹0.
    """
    qty = trade.quantity
    entry = trade.entry_price
    result = (trade.result or "").strip().lower()

    if any(k in result for k in ("cost-to-cost", "cost to cost", "breakeven", "break even")):
        return Decimal("0.00")

    exit_price = resolve_exit_price(trade)
    if entry is not None and exit_price is not None and qty is not None and qty > 0:
        # Bought CE/PE premiums move in rupees 1:1 with premium points × lot size (qty).
        return _money((exit_price - entry) * qty)

    points = points_from_result(trade.result)
    if points is None and trade.pnl is not None and abs(trade.pnl) < Decimal("500"):
        # Legacy rows may still store premium points in pnl
        points = trade.pnl
    if points is not None and qty is not None and qty > 0:
        return _money(points * qty)

    # Already-rupee pnl (large absolute) with no qty math possible
    if trade.pnl is not None and abs(trade.pnl) >= Decimal("500"):
        return _money(trade.pnl)

    return None


def approximate_pnl(trade: JournalTradeLike) -> Decimal | None:
    """Return rupee P&L for analytics.

    Prefer the stored journal trade ``pnl`` when present — Create Journal / publish
    already persists points × quantity. Only recompute from prices when pnl is empty.
    """
    if trade.pnl is not None:
        return _money(trade.pnl)
    return compute_journal_rupee_pnl(trade)


def quantity_or_default(trade: JournalTradeLike) -> Decimal:
    if trade.quantity is not None and trade.quantity > 0:
        return trade.quantity
    return Decimal("1")
