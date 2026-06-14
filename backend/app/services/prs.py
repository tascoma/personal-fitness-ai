from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PersonalRecord, WorkoutSession, WorkoutSet
from app.services.e1rm import pick


async def rebuild_prs(db: AsyncSession, exercise_id: int, formula: str) -> None:
    """Recompute the full PR timeline for one exercise from its working sets.

    A full rebuild on every set change is trivially cheap at personal scale and
    provably correct (handles edits, deletes, and backdated sessions alike).
    Does not commit — caller owns the transaction.
    """
    await db.execute(delete(PersonalRecord).where(PersonalRecord.exercise_id == exercise_id))

    rows = (
        await db.execute(
            select(WorkoutSet, WorkoutSession.date)
            .join(WorkoutSession, WorkoutSet.session_id == WorkoutSession.id)
            .where(WorkoutSet.exercise_id == exercise_id, WorkoutSet.is_warmup.is_(False))
            .order_by(WorkoutSession.date, WorkoutSet.id)
        )
    ).all()

    max_weight = 0.0
    max_e1rm = 0.0
    for workout_set, session_date in rows:
        if workout_set.weight > max_weight:
            max_weight = workout_set.weight
            db.add(
                PersonalRecord(
                    exercise_id=exercise_id,
                    set_id=workout_set.id,
                    record_type="weight",
                    value=workout_set.weight,
                    achieved_on=session_date,
                )
            )
        e1rm = pick(workout_set.e1rm_epley, workout_set.e1rm_brzycki, formula)
        if e1rm > max_e1rm:
            max_e1rm = e1rm
            db.add(
                PersonalRecord(
                    exercise_id=exercise_id,
                    set_id=workout_set.id,
                    record_type="e1rm",
                    value=round(e1rm, 2),
                    achieved_on=session_date,
                )
            )


async def rebuild_all_prs(db: AsyncSession, formula: str) -> None:
    """Rebuild PRs for every exercise that has sets (e.g. after a formula switch)."""
    exercise_ids = (await db.scalars(select(WorkoutSet.exercise_id).distinct())).all()
    for exercise_id in exercise_ids:
        await rebuild_prs(db, exercise_id, formula)
