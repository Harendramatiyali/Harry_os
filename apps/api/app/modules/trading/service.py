"""Trading use-cases and analytics."""

from __future__ import annotations

import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal
from pathlib import Path

from app.core.config import Settings
from app.core.errors import ConflictError, DomainError, NotFoundError
from app.modules.trading.journal_bridge import approximate_pnl, classify_outcome
from app.modules.trading.journal_repository import TradingJournalDayRepository
from app.modules.trading.models import (
    PeriodReview,
    PsychologyEntry,
    ReviewPeriod,
    Trade,
    TradeDirection,
    TradeMistake,
    TradeScreenshot,
    TradeStatus,
)
from app.modules.trading.repository import (
    MistakeRepository,
    PeriodReviewRepository,
    PsychologyRepository,
    ScreenshotRepository,
    TradeRepository,
    soft_delete,
)
from app.modules.trading.schemas import (
    EquityPoint,
    MistakeCreate,
    MistakeOut,
    MistakeStat,
    MistakeUpdate,
    MoodStat,
    PeriodReviewCreate,
    PeriodReviewOut,
    PeriodReviewUpdate,
    PsychologyCreate,
    PsychologyOut,
    ScreenshotOut,
    TradeCreate,
    TradeOut,
    TradeUpdate,
    TradingAnalytics,
)


def _tags_to_csv(tags: list[str]) -> str | None:
    cleaned = sorted({t.strip().lower() for t in tags if t.strip()})
    return ",".join(cleaned) if cleaned else None


def _csv_to_tags(tags_csv: str | None) -> list[str]:
    if not tags_csv:
        return []
    return [t for t in tags_csv.split(",") if t]


def compute_pnl(
    *,
    direction: TradeDirection,
    quantity: Decimal,
    entry: Decimal,
    exit_price: Decimal | None,
    fees: Decimal,
    risk_amount: Decimal | None,
) -> tuple[Decimal | None, Decimal | None, Decimal | None]:
    if exit_price is None:
        return None, None, None
    if direction == TradeDirection.LONG:
        gross = (exit_price - entry) * quantity
    else:
        gross = (entry - exit_price) * quantity
    net = gross - fees
    r_mult = None
    if risk_amount and risk_amount > 0:
        r_mult = (net / risk_amount).quantize(Decimal("0.0001"))
    return gross.quantize(Decimal("0.0001")), net.quantize(Decimal("0.0001")), r_mult


class TradingService:
    def __init__(
        self,
        *,
        trades: TradeRepository,
        mistakes: MistakeRepository,
        psychology: PsychologyRepository,
        screenshots: ScreenshotRepository,
        reviews: PeriodReviewRepository,
        journals: TradingJournalDayRepository,
        settings: Settings,
    ) -> None:
        self.trades = trades
        self.mistakes = mistakes
        self.psychology = psychology
        self.screenshots = screenshots
        self.reviews = reviews
        self.journals = journals
        self.settings = settings

    def to_out(self, trade: Trade) -> TradeOut:
        active_mistakes = [m for m in (trade.mistakes or []) if not m.deleted_at]
        active_shots = [s for s in (trade.screenshots or []) if not s.deleted_at]
        return TradeOut(
            id=trade.id,
            instrument=trade.instrument,
            direction=trade.direction,  # type: ignore[arg-type]
            quantity=trade.quantity,
            entry_price=trade.entry_price,
            exit_price=trade.exit_price,
            opened_at=trade.opened_at,
            closed_at=trade.closed_at,
            fees=trade.fees,
            stop_price=trade.stop_price,
            risk_amount=trade.risk_amount,
            r_multiple=trade.r_multiple,
            pnl_gross=trade.pnl_gross,
            pnl_net=trade.pnl_net,
            setup=trade.setup,
            thesis=trade.thesis,
            status=trade.status,  # type: ignore[arg-type]
            grade=trade.grade,
            followed_plan=trade.followed_plan,
            emotion_before=trade.emotion_before,
            emotion_after=trade.emotion_after,
            psychology_notes=trade.psychology_notes,
            review_notes=trade.review_notes,
            tags=_csv_to_tags(trade.tags_csv),
            mistakes=[MistakeOut.model_validate(m) for m in active_mistakes],
            screenshots=[ScreenshotOut.model_validate(s) for s in active_shots],
            created_at=trade.created_at,
            updated_at=trade.updated_at,
        )

    async def list_trades(self, user_id: str, **filters) -> list[TradeOut]:
        rows = await self.trades.search(user_id, **filters)
        return [self.to_out(t) for t in rows]

    async def get_trade(self, user_id: str, trade_id: str) -> TradeOut:
        trade = await self._get_trade(user_id, trade_id)
        return self.to_out(trade)

    async def create_trade(self, user_id: str, data: TradeCreate) -> TradeOut:
        direction = TradeDirection(data.direction.value)
        status = TradeStatus(data.status.value)
        gross, net, r_mult = compute_pnl(
            direction=direction,
            quantity=data.quantity,
            entry=data.entry_price,
            exit_price=data.exit_price,
            fees=data.fees,
            risk_amount=data.risk_amount,
        )
        if status == TradeStatus.CLOSED and data.exit_price is None:
            raise DomainError("Closed trades require exit_price")

        trade = Trade(
            id=str(uuid.uuid4()),
            user_id=user_id,
            instrument=data.instrument.strip().upper(),
            direction=direction,
            quantity=data.quantity,
            entry_price=data.entry_price,
            exit_price=data.exit_price,
            opened_at=data.opened_at,
            closed_at=data.closed_at,
            fees=data.fees,
            stop_price=data.stop_price,
            risk_amount=data.risk_amount,
            r_multiple=r_mult,
            pnl_gross=gross,
            pnl_net=net,
            setup=data.setup,
            thesis=data.thesis,
            status=status,
            grade=data.grade,
            followed_plan=data.followed_plan,
            emotion_before=data.emotion_before,
            emotion_after=data.emotion_after,
            psychology_notes=data.psychology_notes,
            review_notes=data.review_notes,
            tags_csv=_tags_to_csv(data.tags),
        )
        await self.trades.add(trade)

        for desc in data.mistakes:
            if not desc.strip():
                continue
            await self.mistakes.add(
                TradeMistake(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    trade_id=trade.id,
                    category="process",
                    description=desc.strip(),
                    severity=2,
                    occurred_on=(data.opened_at.date() if hasattr(data.opened_at, "date") else date.today()),
                )
            )

        trade = await self.trades.get_with_relations(trade.id)
        assert trade
        return self.to_out(trade)

    async def update_trade(self, user_id: str, trade_id: str, data: TradeUpdate) -> TradeOut:
        trade = await self._get_trade(user_id, trade_id)
        payload = data.model_dump(exclude_unset=True)
        tags = payload.pop("tags", None)
        mistakes = payload.pop("mistakes", None)

        if "direction" in payload and payload["direction"] is not None:
            payload["direction"] = TradeDirection(payload["direction"].value if hasattr(payload["direction"], "value") else payload["direction"])
        if "status" in payload and payload["status"] is not None:
            payload["status"] = TradeStatus(payload["status"].value if hasattr(payload["status"], "value") else payload["status"])
        if "instrument" in payload and payload["instrument"]:
            payload["instrument"] = payload["instrument"].strip().upper()

        for field, value in payload.items():
            setattr(trade, field, value)

        if tags is not None:
            trade.tags_csv = _tags_to_csv(tags)

        direction = trade.direction if isinstance(trade.direction, TradeDirection) else TradeDirection(trade.direction)
        gross, net, r_mult = compute_pnl(
            direction=direction,
            quantity=trade.quantity,
            entry=trade.entry_price,
            exit_price=trade.exit_price,
            fees=trade.fees or Decimal("0"),
            risk_amount=trade.risk_amount,
        )
        trade.pnl_gross, trade.pnl_net, trade.r_multiple = gross, net, r_mult

        if trade.status == TradeStatus.CLOSED and trade.exit_price is None:
            raise DomainError("Closed trades require exit_price")

        if mistakes is not None:
            for m in list(trade.mistakes or []):
                if not m.deleted_at:
                    soft_delete(m)
            for desc in mistakes:
                if not desc.strip():
                    continue
                await self.mistakes.add(
                    TradeMistake(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        trade_id=trade.id,
                        category="process",
                        description=desc.strip(),
                        severity=2,
                        occurred_on=trade.opened_at.date(),
                    )
                )

        await self.trades.session.flush()
        trade = await self.trades.get_with_relations(trade.id)
        assert trade
        return self.to_out(trade)

    async def delete_trade(self, user_id: str, trade_id: str) -> None:
        trade = await self._get_trade(user_id, trade_id)
        soft_delete(trade)
        await self.trades.session.flush()

    # Mistakes
    async def list_mistakes(self, user_id: str, **kwargs) -> list[MistakeOut]:
        rows = await self.mistakes.list_for_user(user_id, **kwargs)
        return [MistakeOut.model_validate(r) for r in rows]

    async def create_mistake(self, user_id: str, data: MistakeCreate) -> MistakeOut:
        if data.trade_id:
            await self._get_trade(user_id, data.trade_id)
        row = TradeMistake(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trade_id=data.trade_id,
            category=data.category.strip().lower(),
            description=data.description.strip(),
            severity=data.severity,
            occurred_on=data.occurred_on,
        )
        await self.mistakes.add(row)
        return MistakeOut.model_validate(row)

    async def update_mistake(self, user_id: str, mistake_id: str, data: MistakeUpdate) -> MistakeOut:
        row = await self.mistakes.get_by_id(mistake_id)
        if not row or row.user_id != user_id or row.deleted_at:
            raise NotFoundError("Mistake not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        await self.mistakes.session.flush()
        return MistakeOut.model_validate(row)

    async def delete_mistake(self, user_id: str, mistake_id: str) -> None:
        row = await self.mistakes.get_by_id(mistake_id)
        if not row or row.user_id != user_id or row.deleted_at:
            raise NotFoundError("Mistake not found")
        soft_delete(row)
        await self.mistakes.session.flush()

    # Psychology
    async def list_psychology(self, user_id: str) -> list[PsychologyOut]:
        rows = await self.psychology.list_for_user(user_id)
        return [PsychologyOut.model_validate(r) for r in rows]

    async def create_psychology(self, user_id: str, data: PsychologyCreate) -> PsychologyOut:
        if data.trade_id:
            await self._get_trade(user_id, data.trade_id)
        row = PsychologyEntry(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trade_id=data.trade_id,
            entry_date=data.entry_date,
            mood=data.mood.strip().lower(),
            confidence=data.confidence,
            stress=data.stress,
            discipline=data.discipline,
            notes=data.notes,
        )
        await self.psychology.add(row)
        return PsychologyOut.model_validate(row)

    async def delete_psychology(self, user_id: str, entry_id: str) -> None:
        row = await self.psychology.get_by_id(entry_id)
        if not row or row.user_id != user_id or row.deleted_at:
            raise NotFoundError("Psychology entry not found")
        soft_delete(row)
        await self.psychology.session.flush()

    # Screenshots
    async def add_screenshot(
        self,
        user_id: str,
        trade_id: str,
        *,
        file_name: str,
        content_type: str,
        data: bytes,
        caption: str | None = None,
    ) -> ScreenshotOut:
        trade = await self._get_trade(user_id, trade_id)
        if len(data) > self.settings.max_upload_bytes:
            raise DomainError("File exceeds max upload size")
        if not content_type.startswith("image/"):
            raise DomainError("Only image uploads are allowed")

        media = Path(self.settings.media_root) / "trading" / user_id / trade.id
        media.mkdir(parents=True, exist_ok=True)
        shot_id = str(uuid.uuid4())
        safe_name = Path(file_name).name
        dest = media / f"{shot_id}_{safe_name}"
        dest.write_bytes(data)

        row = TradeScreenshot(
            id=shot_id,
            user_id=user_id,
            trade_id=trade.id,
            file_name=safe_name,
            content_type=content_type,
            byte_size=len(data),
            storage_path=str(dest),
            caption=caption,
        )
        await self.screenshots.add(row)
        return ScreenshotOut.model_validate(row)

    async def get_screenshot_file(self, user_id: str, screenshot_id: str) -> TradeScreenshot:
        row = await self.screenshots.get_by_id(screenshot_id)
        if not row or row.user_id != user_id or row.deleted_at:
            raise NotFoundError("Screenshot not found")
        return row

    async def delete_screenshot(self, user_id: str, screenshot_id: str) -> None:
        row = await self.get_screenshot_file(user_id, screenshot_id)
        soft_delete(row)
        await self.screenshots.session.flush()

    # Reviews
    async def list_reviews(self, user_id: str, period_type: str | None = None) -> list[PeriodReviewOut]:
        rows = await self.reviews.list_for_user(user_id, period_type)
        return [PeriodReviewOut.model_validate(r) for r in rows]

    async def create_review(self, user_id: str, data: PeriodReviewCreate) -> PeriodReviewOut:
        if data.period_end < data.period_start:
            raise DomainError("period_end must be on/after period_start")
        existing = await self.reviews.get_unique(user_id, data.period_type.value, data.period_start)
        if existing:
            raise ConflictError("Review already exists for this period")

        start_dt = datetime.combine(data.period_start, time.min, tzinfo=timezone.utc)
        end_dt = datetime.combine(data.period_end, time.max, tzinfo=timezone.utc)
        closed = await self.trades.list_closed_between(user_id, start_dt, end_dt)
        winners = [t for t in closed if t.pnl_net and t.pnl_net > 0]
        win_rate = (Decimal(len(winners)) / Decimal(len(closed)) * 100) if closed else None
        nets = [t.pnl_net for t in closed if t.pnl_net is not None]
        rs = [t.r_multiple for t in closed if t.r_multiple is not None]
        net_pnl = sum(nets, Decimal("0")) if nets else Decimal("0")
        avg_r = (sum(rs, Decimal("0")) / Decimal(len(rs))) if rs else None

        row = PeriodReview(
            id=str(uuid.uuid4()),
            user_id=user_id,
            period_type=ReviewPeriod(data.period_type.value),
            period_start=data.period_start,
            period_end=data.period_end,
            title=data.title.strip(),
            what_went_well=data.what_went_well,
            what_to_improve=data.what_to_improve,
            focus_next=data.focus_next,
            grade=data.grade,
            trades_count=len(closed),
            win_rate=win_rate,
            net_pnl=net_pnl,
            avg_r=avg_r,
        )
        await self.reviews.add(row)
        return PeriodReviewOut.model_validate(row)

    async def update_review(self, user_id: str, review_id: str, data: PeriodReviewUpdate) -> PeriodReviewOut:
        row = await self.reviews.get_by_id(review_id)
        if not row or row.user_id != user_id or row.deleted_at:
            raise NotFoundError("Review not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        await self.reviews.session.flush()
        return PeriodReviewOut.model_validate(row)

    async def delete_review(self, user_id: str, review_id: str) -> None:
        row = await self.reviews.get_by_id(review_id)
        if not row or row.user_id != user_id or row.deleted_at:
            raise NotFoundError("Review not found")
        soft_delete(row)
        await self.reviews.session.flush()

    # Analytics
    async def analytics(
        self,
        user_id: str,
        *,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> TradingAnalytics:
        trades = await self.trades.search(
            user_id,
            date_from=date_from,
            date_to=date_to,
            limit=5000,
        )
        closed = [t for t in trades if t.status == TradeStatus.CLOSED]

        # Prefer Day Journal analytics when journals are the richer / primary source.
        # (Trade Log ledger is often incomplete or out of sync with journal P&L.)
        journal_analytics = await self._analytics_from_journals(
            user_id,
            date_from=date_from.date() if date_from else None,
            date_to=date_to.date() if date_to else None,
        )
        if (
            journal_analytics is not None
            and journal_analytics.trades_count > 0
            and journal_analytics.trades_count >= len(closed)
        ):
            return journal_analytics

        open_trades = [t for t in trades if t.status == TradeStatus.OPEN]
        winners = [t for t in closed if t.pnl_net is not None and t.pnl_net > 0]
        losers = [t for t in closed if t.pnl_net is not None and t.pnl_net < 0]
        breakevens = [
            t for t in closed if t.pnl_net is not None and t.pnl_net == 0
        ]
        # Win rate over decided outcomes only (exclude flat / null P&L)
        decided = len(winners) + len(losers)
        win_rate = (len(winners) / decided * 100.0) if decided else 0.0

        rs = [float(t.r_multiple) for t in closed if t.r_multiple is not None]
        avg_r = sum(rs) / len(rs) if rs else None
        expectancy_r = sum(rs) / len(rs) if rs else None

        nets = [t.pnl_net or Decimal("0") for t in closed]
        grosses = [t.pnl_gross or Decimal("0") for t in closed]
        fees = [t.fees or Decimal("0") for t in trades]
        net_pnl = sum(nets, Decimal("0"))
        gross_pnl = sum(grosses, Decimal("0"))
        fees_total = sum(fees, Decimal("0"))

        gross_wins = sum((t.pnl_net for t in winners), Decimal("0"))
        gross_losses = abs(sum((t.pnl_net for t in losers), Decimal("0")))
        profit_factor = float(gross_wins / gross_losses) if gross_losses > 0 else None

        best = max((t.pnl_net for t in closed if t.pnl_net is not None), default=None)
        worst = min((t.pnl_net for t in closed if t.pnl_net is not None), default=None)

        by_setup_map: dict[str, list[Decimal]] = {}
        for t in closed:
            key = t.setup or "unspecified"
            by_setup_map.setdefault(key, []).append(t.pnl_net or Decimal("0"))
        by_setup = [
            {
                "setup": k,
                "count": len(v),
                "net_pnl": float(sum(v, Decimal("0"))),
                "win_rate": round(len([x for x in v if x > 0]) / len(v) * 100, 1) if v else 0,
            }
            for k, v in sorted(by_setup_map.items(), key=lambda i: -len(i[1]))
        ]

        by_tag_map: dict[str, list[Decimal]] = {}
        for t in closed:
            for tag in _csv_to_tags(t.tags_csv):
                by_tag_map.setdefault(tag, []).append(t.pnl_net or Decimal("0"))
        by_tag = [
            {"tag": k, "count": len(v), "net_pnl": float(sum(v, Decimal("0")))}
            for k, v in sorted(by_tag_map.items(), key=lambda i: -len(i[1]))
        ]

        closed_sorted = sorted(
            [t for t in closed if t.closed_at and t.pnl_net is not None],
            key=lambda t: t.closed_at or t.opened_at,
        )
        equity = Decimal("0")
        curve: list[EquityPoint] = []
        for t in closed_sorted:
            equity += t.pnl_net or Decimal("0")
            curve.append(
                EquityPoint(
                    date=(t.closed_at or t.opened_at).date(),
                    equity=equity,
                    pnl=t.pnl_net or Decimal("0"),
                )
            )

        mistake_rows = await self.mistakes.stats(user_id)
        mistake_stats = [MistakeStat(category=c, count=n) for c, n in mistake_rows]

        psych = await self.psychology.list_for_user(user_id, limit=500)
        moods = sorted({p.mood for p in psych})
        psychology_stats: list[MoodStat] = []
        for mood in moods:
            entries = [p for p in psych if p.mood == mood]
            linked_pnls = [
                t.pnl_net
                for p in entries
                if p.trade_id
                for t in trades
                if t.id == p.trade_id and t.pnl_net is not None
            ]
            psychology_stats.append(
                MoodStat(
                    mood=mood,
                    count=len(entries),
                    avg_pnl=(sum(linked_pnls, Decimal("0")) / Decimal(len(linked_pnls)))
                    if linked_pnls
                    else None,
                )
            )

        return TradingAnalytics(
            trades_count=len(trades),
            closed_count=len(closed),
            open_count=len(open_trades),
            winners=len(winners),
            losers=len(losers),
            breakevens=len(breakevens),
            win_rate=round(win_rate, 2),
            avg_r=round(avg_r, 4) if avg_r is not None else None,
            expectancy_r=round(expectancy_r, 4) if expectancy_r is not None else None,
            net_pnl=net_pnl,
            gross_pnl=gross_pnl,
            fees_total=fees_total,
            profit_factor=round(profit_factor, 3) if profit_factor is not None else None,
            best_trade=best,
            worst_trade=worst,
            by_setup=by_setup,
            by_tag=by_tag,
            equity_curve=curve,
            mistake_stats=mistake_stats,
            psychology_stats=psychology_stats,
        )

    async def _analytics_from_journals(
        self,
        user_id: str,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> TradingAnalytics | None:
        """Fill Analytics from Day Journals when Trade Log ledger is empty/sparse."""
        jtrades = await self.journals.list_trades_for_user(
            user_id,
            date_from=date_from,
            date_to=date_to,
        )
        if not jtrades:
            return None

        rows: list[tuple[object, str, Decimal | None]] = []
        for t in jtrades:
            outcome = classify_outcome(t)
            pnl = approximate_pnl(t)
            rows.append((t, outcome, pnl))

        winners = [r for r in rows if r[1] == "win"]
        losers = [r for r in rows if r[1] == "loss"]
        breakevens = [r for r in rows if r[1] == "scratch"]
        classified = winners + losers
        win_rate = (len(winners) / len(classified) * 100.0) if classified else 0.0

        pnls = [r[2] for r in rows if r[2] is not None]
        net_pnl = sum(pnls, Decimal("0")) if pnls else Decimal("0")
        best = max(pnls) if pnls else None
        worst = min(pnls) if pnls else None
        gross_wins = sum((p for p in pnls if p > 0), Decimal("0"))
        gross_losses = abs(sum((p for p in pnls if p < 0), Decimal("0")))
        profit_factor = float(gross_wins / gross_losses) if gross_losses > 0 else None

        by_setup_map: dict[str, list[Decimal]] = {}
        for t, outcome, pnl in rows:
            key = (t.setup or "unspecified").strip() or "unspecified"
            value = pnl if pnl is not None else (
                Decimal("1") if outcome == "win" else Decimal("-1") if outcome == "loss" else Decimal("0")
            )
            by_setup_map.setdefault(key, []).append(value)
        by_setup = [
            {
                "setup": k,
                "count": len(v),
                "net_pnl": float(sum(v, Decimal("0"))),
                "win_rate": round(len([x for x in v if x > 0]) / len(v) * 100, 1) if v else 0,
            }
            for k, v in sorted(by_setup_map.items(), key=lambda i: -len(i[1]))
        ]

        dated: list[tuple[date, Decimal]] = []
        for t, _outcome, pnl in rows:
            if pnl is None:
                continue
            day = t.journal_day.journal_date if getattr(t, "journal_day", None) else None
            if day is None:
                continue
            dated.append((day, pnl))
        dated.sort(key=lambda x: x[0])
        equity = Decimal("0")
        curve: list[EquityPoint] = []
        for d, pnl in dated:
            equity += pnl
            curve.append(EquityPoint(date=d, equity=equity, pnl=pnl))

        mistake_sections = 0
        for t, _, _ in rows:
            for s in getattr(t, "sections", None) or []:
                key = s.section_key.value if hasattr(s.section_key, "value") else str(s.section_key)
                if key == "mistakes" and (s.body_markdown or "").strip():
                    mistake_sections += 1
                    break
        mistake_stats = (
            [MistakeStat(category="journal_mistakes", count=mistake_sections)]
            if mistake_sections
            else []
        )

        return TradingAnalytics(
            trades_count=len(jtrades),
            closed_count=len(classified) + len(breakevens),
            open_count=len(jtrades) - len(classified) - len(breakevens),
            winners=len(winners),
            losers=len(losers),
            breakevens=len(breakevens),
            win_rate=round(win_rate, 2),
            avg_r=None,
            expectancy_r=None,
            net_pnl=net_pnl,
            gross_pnl=net_pnl,
            fees_total=Decimal("0"),
            profit_factor=round(profit_factor, 3) if profit_factor is not None else None,
            best_trade=best,
            worst_trade=worst,
            by_setup=by_setup,
            by_tag=[{"tag": "journal", "count": len(jtrades), "net_pnl": float(net_pnl)}],
            equity_curve=curve,
            mistake_stats=mistake_stats,
            psychology_stats=[],
        )

    async def _get_trade(self, user_id: str, trade_id: str) -> Trade:
        trade = await self.trades.get_with_relations(trade_id)
        if not trade or trade.user_id != user_id or trade.deleted_at:
            raise NotFoundError("Trade not found")
        return trade
