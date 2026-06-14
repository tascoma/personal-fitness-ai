"""Assemble the deterministic metric payloads that get injected into the coach
agents' prompts (and double as AI cache fingerprints)."""

from collections import Counter
from datetime import date as date_type
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Exercise, PersonalRecord, WorkoutSession, WorkoutSet
from app.schemas.ai import LiftTarget
from app.services.analytics import (
    detect_deload,
    detect_plateau,
    e1rm_series,
    round_to_5,
    summary_stats,
    tonnage_buckets,
)
from app.services.e1rm import pick
from app.services.user_settings import get_settings
from app.services.workout_sessions import get_session


def _rep_scheme(working_sets: list[WorkoutSet], top_weight: float) -> str:
    top_sets = [s for s in working_sets if s.weight == top_weight]
    modal_reps = Counter(s.reps for s in top_sets).most_common(1)[0][0]
    return f"{len(top_sets)}×{modal_reps}"


async def session_metrics(db: AsyncSession, session_id: int) -> dict:
    session = await get_session(db, session_id)
    formula = (await get_settings(db)).e1rm_formula

    working = [s for s in session.sets if not s.is_warmup]
    exercise_ids = sorted({s.exercise_id for s in working})
    lifts = []
    for exercise_id in exercise_ids:
        exercise = await db.get(Exercise, exercise_id)
        sets_today = [s for s in working if s.exercise_id == exercise_id]
        best_today = max(pick(s.e1rm_epley, s.e1rm_brzycki, formula) for s in sets_today)

        series = await e1rm_series(db, exercise_id, formula)
        prior = [
            v
            for d, v in series
            if session.date - timedelta(days=28) <= d < session.date
        ]
        trailing_avg = round(sum(prior) / len(prior), 1) if prior else None
        pct_change = (
            round((best_today / trailing_avg - 1) * 100, 1) if trailing_avg else None
        )
        prs_today = (
            await db.scalars(
                select(PersonalRecord).where(
                    PersonalRecord.exercise_id == exercise_id,
                    PersonalRecord.achieved_on == session.date,
                )
            )
        ).all()
        lifts.append(
            {
                "exercise": exercise.name,
                "sets": [
                    {"weight": s.weight, "reps": s.reps, "rpe": s.rpe} for s in sets_today
                ],
                "best_e1rm_today": round(best_today, 1),
                "trailing_4wk_avg_e1rm": trailing_avg,
                "pct_change_vs_4wk_avg": pct_change,
                "plateau": detect_plateau(series, session.date),
                "prs_achieved": [
                    {"type": pr.record_type, "value": pr.value} for pr in prs_today
                ],
            }
        )

    return {
        "session_id": session.id,
        "date": session.date.isoformat(),
        "notes": session.notes,
        "tonnage": sum(s.weight * s.reps for s in working),
        "e1rm_formula": formula,
        "lifts": lifts,
    }


async def recommendation_targets(db: AsyncSession, as_of: date_type) -> list[LiftTarget]:
    """Progressive-overload targets for every lift trained in the last 6 weeks."""
    formula = (await get_settings(db)).e1rm_formula
    cutoff = as_of - timedelta(weeks=6)
    exercise_ids = (
        await db.scalars(
            select(WorkoutSet.exercise_id)
            .join(WorkoutSession, WorkoutSet.session_id == WorkoutSession.id)
            .where(WorkoutSession.date >= cutoff, WorkoutSet.is_warmup.is_(False))
            .distinct()
        )
    ).all()

    targets = []
    for exercise_id in sorted(exercise_ids):
        exercise = await db.get(Exercise, exercise_id)
        last_date = await db.scalar(
            select(WorkoutSession.date)
            .join(WorkoutSet, WorkoutSet.session_id == WorkoutSession.id)
            .where(WorkoutSet.exercise_id == exercise_id, WorkoutSet.is_warmup.is_(False))
            .order_by(WorkoutSession.date.desc())
            .limit(1)
        )
        last_sets = (
            await db.scalars(
                select(WorkoutSet)
                .join(WorkoutSession, WorkoutSet.session_id == WorkoutSession.id)
                .where(
                    WorkoutSet.exercise_id == exercise_id,
                    WorkoutSet.is_warmup.is_(False),
                    WorkoutSession.date == last_date,
                )
            )
        ).all()
        top_weight = max(s.weight for s in last_sets)

        series = await e1rm_series(db, exercise_id, formula)
        deload = detect_deload(series)
        plateau = detect_plateau(series, as_of)
        if deload:
            action, target = "deload", round_to_5(0.9 * top_weight)
        elif plateau:
            action, target = "hold", top_weight
        else:
            action, target = "increase", top_weight + exercise.increment

        targets.append(
            LiftTarget(
                exercise_id=exercise_id,
                exercise_name=exercise.name,
                last_session_date=last_date,
                last_top_weight=top_weight,
                target_weight=target,
                rep_scheme=_rep_scheme(list(last_sets), top_weight),
                action=action,
                plateau=plateau,
                deload=deload,
            )
        )
    return targets


async def weekly_metrics(db: AsyncSession, as_of: date_type) -> dict:
    """Cross-lift metrics for the ISO week containing `as_of`."""
    formula = (await get_settings(db)).e1rm_formula
    iso = as_of.isocalendar()
    week_key = f"{iso.year}-W{iso.week:02d}"
    week_start = as_of - timedelta(days=as_of.weekday())

    exercise_ids = (
        await db.scalars(
            select(WorkoutSet.exercise_id)
            .join(WorkoutSession, WorkoutSet.session_id == WorkoutSession.id)
            .where(WorkoutSession.date >= week_start, WorkoutSession.date <= as_of)
            .where(WorkoutSet.is_warmup.is_(False))
            .distinct()
        )
    ).all()

    lifts = []
    for exercise_id in sorted(exercise_ids):
        exercise = await db.get(Exercise, exercise_id)
        buckets = dict(await tonnage_buckets(db, exercise_id, "week"))
        this_week = buckets.get(week_key, 0.0)
        prior_keys = []
        for back in range(1, 5):
            prior_iso = (week_start - timedelta(weeks=back)).isocalendar()
            prior_keys.append(f"{prior_iso.year}-W{prior_iso.week:02d}")
        prior_values = [buckets[k] for k in prior_keys if k in buckets]
        prior_avg = round(sum(prior_values) / len(prior_values), 1) if prior_values else None

        series = await e1rm_series(db, exercise_id, formula)
        week_values = [v for d, v in series if week_start <= d <= as_of]
        pr_count = await db.scalar(
            select(PersonalRecord.id)
            .where(
                PersonalRecord.exercise_id == exercise_id,
                PersonalRecord.achieved_on >= week_start,
                PersonalRecord.achieved_on <= as_of,
            )
            .limit(1)
        )
        lifts.append(
            {
                "exercise": exercise.name,
                "week_tonnage": this_week,
                "prior_4wk_avg_tonnage": prior_avg,
                "best_e1rm_this_week": round(max(week_values), 1) if week_values else None,
                "hit_pr": pr_count is not None,
                "plateau": detect_plateau(series, as_of),
                "deload_suggested": detect_deload(series),
            }
        )

    session_count = len(
        (
            await db.scalars(
                select(WorkoutSession.id).where(
                    WorkoutSession.date >= week_start, WorkoutSession.date <= as_of
                )
            )
        ).all()
    )
    return {
        "week": week_key,
        "sessions": session_count,
        "e1rm_formula": formula,
        "lifts": lifts,
    }


async def dashboard_metrics(db: AsyncSession, as_of: date_type) -> dict:
    """High-level "state of training" payload: all-time/weekly summary, the top
    progressive-overload targets, and the most recent PRs."""
    summary = await summary_stats(db, as_of)
    targets = await recommendation_targets(db, as_of)

    recent_pr_rows = (
        await db.execute(
            select(PersonalRecord, Exercise.name)
            .join(Exercise, PersonalRecord.exercise_id == Exercise.id)
            .order_by(PersonalRecord.achieved_on.desc(), PersonalRecord.id.desc())
            .limit(5)
        )
    ).all()

    return {
        "summary": summary.__dict__,
        "top_targets": [
            {
                "exercise": t.exercise_name,
                "target_weight": t.target_weight,
                "rep_scheme": t.rep_scheme,
                "action": t.action,
            }
            for t in targets[:3]
        ],
        "recent_prs": [
            {
                "exercise": name,
                "type": pr.record_type,
                "value": pr.value,
                "achieved_on": pr.achieved_on.isoformat(),
            }
            for pr, name in recent_pr_rows
        ],
    }
