"""Deterministic training analytics: tonnage, e1RM series, trend regression,
milestone projection, plateau and deload detection. Pure stdlib — the AI layer
narrates these numbers but never computes them."""

import math
from dataclasses import dataclass
from datetime import date as date_type
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import WorkoutSession, WorkoutSet
from app.services.e1rm import pick

MILESTONES = [135.0, 185.0, 225.0, 275.0, 315.0, 365.0, 405.0, 455.0, 495.0] + [
    float(v) for v in range(545, 1005, 50)
]

# ---------- pure math ----------


def linear_regression(points: list[tuple[float, float]]) -> tuple[float, float, float]:
    """Least squares fit. Returns (slope, intercept, residual_std_error).

    Requires len(points) >= 3 for a meaningful std error (n-2 dof).
    """
    n = len(points)
    mean_x = sum(x for x, _ in points) / n
    mean_y = sum(y for _, y in points) / n
    sxx = sum((x - mean_x) ** 2 for x, _ in points)
    if sxx == 0:
        return 0.0, mean_y, 0.0
    slope = sum((x - mean_x) * (y - mean_y) for x, y in points) / sxx
    intercept = mean_y - slope * mean_x
    if n <= 2:
        return slope, intercept, 0.0
    sse = sum((y - (intercept + slope * x)) ** 2 for x, y in points)
    return slope, intercept, math.sqrt(sse / (n - 2))


def next_milestone(current_best: float) -> float | None:
    for milestone in MILESTONES:
        if milestone > current_best:
            return milestone
    return None


@dataclass
class Prediction:
    status: str  # "ok" | "insufficient_data" | "no_positive_trend" | "no_milestone"
    current_best: float = 0.0
    milestone: float | None = None
    slope_per_week: float | None = None
    projected_date: date_type | None = None
    ci_earliest: date_type | None = None
    ci_latest: date_type | None = None
    n_points: int = 0


def project_milestone(series: list[tuple[date_type, float]], window_weeks: int = 8) -> Prediction:
    """Project when the e1RM trend crosses the next round-number milestone.

    Fits the last `window_weeks` of (date, best-session-e1RM) points; the 95% CI
    band comes from the residual std error of the fit.
    """
    if not series:
        return Prediction(status="insufficient_data")

    current_best = max(value for _, value in series)
    last_date = series[-1][0]
    window = [(d, v) for d, v in series if d >= last_date - timedelta(weeks=window_weeks)]
    if len(window) < 4:
        return Prediction(status="insufficient_data", current_best=current_best, n_points=len(window))

    origin = window[0][0]
    points = [((d - origin).days * 1.0, v) for d, v in window]
    slope, intercept, stderr = linear_regression(points)

    milestone = next_milestone(current_best)
    if milestone is None:
        return Prediction(status="no_milestone", current_best=current_best, n_points=len(window))
    if slope <= 0:
        return Prediction(
            status="no_positive_trend",
            current_best=current_best,
            milestone=milestone,
            slope_per_week=round(slope * 7, 3),
            n_points=len(window),
        )

    def date_at(target: float) -> date_type:
        days = (target - intercept) / slope
        return origin + timedelta(days=round(days))

    today_floor = last_date
    projected = max(date_at(milestone), today_floor)
    return Prediction(
        status="ok",
        current_best=current_best,
        milestone=milestone,
        slope_per_week=round(slope * 7, 3),
        projected_date=projected,
        ci_earliest=max(date_at(milestone - 1.96 * stderr), today_floor),
        ci_latest=max(date_at(milestone + 1.96 * stderr), today_floor),
        n_points=len(window),
    )


def detect_plateau(series: list[tuple[date_type, float]], as_of: date_type) -> bool:
    """Plateau: best e1RM in the last 7 days is <2% above the best from 21-28
    days ago. Requires data in both windows (i.e. >= 3 weeks of history)."""
    recent = [v for d, v in series if as_of - timedelta(days=7) <= d <= as_of]
    baseline = [v for d, v in series if as_of - timedelta(days=28) <= d <= as_of - timedelta(days=21)]
    if not recent or not baseline:
        return False
    return max(recent) < 1.02 * max(baseline)


def detect_deload(series: list[tuple[date_type, float]]) -> bool:
    """Deload warranted when the best session e1RM declined 2+ consecutive sessions."""
    if len(series) < 3:
        return False
    a, b, c = series[-3][1], series[-2][1], series[-1][1]
    return c < b < a


def round_to_5(value: float) -> float:
    return round(value / 5) * 5


# ---------- DB-backed series ----------


async def e1rm_series(
    db: AsyncSession,
    exercise_id: int,
    formula: str,
    since: date_type | None = None,
) -> list[tuple[date_type, float]]:
    """Best working-set e1RM per session date, ascending."""
    stmt = (
        select(WorkoutSession.date, WorkoutSet.e1rm_epley, WorkoutSet.e1rm_brzycki)
        .join(WorkoutSession, WorkoutSet.session_id == WorkoutSession.id)
        .where(WorkoutSet.exercise_id == exercise_id, WorkoutSet.is_warmup.is_(False))
        .order_by(WorkoutSession.date)
    )
    if since is not None:
        stmt = stmt.where(WorkoutSession.date >= since)
    best_by_date: dict[date_type, float] = {}
    for session_date, e_epley, e_brzycki in (await db.execute(stmt)).all():
        value = pick(e_epley, e_brzycki, formula)
        if value > best_by_date.get(session_date, 0.0):
            best_by_date[session_date] = value
    return sorted(best_by_date.items())


async def tonnage_buckets(
    db: AsyncSession,
    exercise_id: int | None,
    period: str,  # "week" | "month"
) -> list[tuple[str, float]]:
    """Total working-set tonnage bucketed by ISO week ("2026-W23") or month ("2026-06")."""
    stmt = (
        select(WorkoutSession.date, WorkoutSet.weight, WorkoutSet.reps)
        .join(WorkoutSession, WorkoutSet.session_id == WorkoutSession.id)
        .where(WorkoutSet.is_warmup.is_(False))
        .order_by(WorkoutSession.date)
    )
    if exercise_id is not None:
        stmt = stmt.where(WorkoutSet.exercise_id == exercise_id)
    buckets: dict[str, float] = {}
    for session_date, weight, reps in (await db.execute(stmt)).all():
        if period == "month":
            key = f"{session_date.year}-{session_date.month:02d}"
        else:
            iso = session_date.isocalendar()
            key = f"{iso.year}-W{iso.week:02d}"
        buckets[key] = buckets.get(key, 0.0) + weight * reps
    return sorted(buckets.items())
