import pytest
from sqlalchemy import select

from app.models import PersonalRecord


async def _setup(client, exercise="Bench Press"):
    exercise_id = next(
        e["id"] for e in (await client.get("/api/exercises")).json() if e["name"] == exercise
    )
    return exercise_id


async def _prs(db_session, exercise_id, record_type=None):
    stmt = select(PersonalRecord).where(PersonalRecord.exercise_id == exercise_id)
    if record_type:
        stmt = stmt.where(PersonalRecord.record_type == record_type)
    return list((await db_session.scalars(stmt.order_by(PersonalRecord.achieved_on))).all())


async def _log(client, session_date, exercise_id, weight, reps, is_warmup=False):
    session = (await client.post("/api/sessions", json={"date": session_date})).json()
    resp = await client.post(
        f"/api/sessions/{session['id']}/sets",
        json={"exercise_id": exercise_id, "weight": weight, "reps": reps, "is_warmup": is_warmup},
    )
    return resp.json()


async def test_pr_created_on_first_set(client, db_session):
    exercise_id = await _setup(client)
    await _log(client, "2026-06-01", exercise_id, 185, 5)
    weight_prs = await _prs(db_session, exercise_id, "weight")
    e1rm_prs = await _prs(db_session, exercise_id, "e1rm")
    assert len(weight_prs) == 1 and weight_prs[0].value == 185
    assert len(e1rm_prs) == 1 and e1rm_prs[0].value == pytest.approx(215.83, abs=0.01)


async def test_no_pr_for_lower_set(client, db_session):
    exercise_id = await _setup(client)
    await _log(client, "2026-06-01", exercise_id, 185, 5)
    await _log(client, "2026-06-08", exercise_id, 175, 5)
    assert len(await _prs(db_session, exercise_id, "weight")) == 1


async def test_no_pr_for_warmup_set(client, db_session):
    exercise_id = await _setup(client)
    await _log(client, "2026-06-01", exercise_id, 135, 5, is_warmup=True)
    assert await _prs(db_session, exercise_id) == []


async def test_pr_timeline_grows(client, db_session):
    exercise_id = await _setup(client)
    await _log(client, "2026-06-01", exercise_id, 185, 5)
    await _log(client, "2026-06-08", exercise_id, 190, 5)
    weight_prs = await _prs(db_session, exercise_id, "weight")
    assert [pr.value for pr in weight_prs] == [185, 190]


async def test_prs_rebuilt_after_set_edit(client, db_session):
    exercise_id = await _setup(client)
    logged = await _log(client, "2026-06-01", exercise_id, 185, 5)
    await _log(client, "2026-06-08", exercise_id, 190, 5)
    # Drop the first set's weight; the timeline should now start at 190
    await client.patch(f"/api/sets/{logged['id']}", json={"weight": 95})
    db_session.expire_all()
    weight_prs = await _prs(db_session, exercise_id, "weight")
    assert [pr.value for pr in weight_prs] == [95, 190]


async def test_prs_rebuilt_after_set_delete(client, db_session):
    exercise_id = await _setup(client)
    await _log(client, "2026-06-01", exercise_id, 185, 5)
    second = await _log(client, "2026-06-08", exercise_id, 200, 5)
    await client.delete(f"/api/sets/{second['id']}")
    db_session.expire_all()
    weight_prs = await _prs(db_session, exercise_id, "weight")
    assert [pr.value for pr in weight_prs] == [185]


async def test_formula_switch_rebuilds_e1rm_prs(client, db_session):
    exercise_id = await _setup(client)
    await _log(client, "2026-06-01", exercise_id, 185, 5)
    await client.patch("/api/settings", json={"e1rm_formula": "brzycki"})
    db_session.expire_all()
    e1rm_prs = await _prs(db_session, exercise_id, "e1rm")
    assert e1rm_prs[0].value == pytest.approx(208.13, abs=0.01)
