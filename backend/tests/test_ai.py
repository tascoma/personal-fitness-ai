from datetime import date, timedelta

from pydantic_ai.models.test import TestModel

from app.agents.coach import digest_agent, insight_agent, recommendation_agent


async def _squat_id(client):
    return next(e["id"] for e in (await client.get("/api/exercises")).json() if e["name"] == "Squat")


async def _log(client, session_date, exercise_id, weight, reps):
    session = (await client.post("/api/sessions", json={"date": session_date.isoformat()})).json()
    workout_set = (
        await client.post(
            f"/api/sessions/{session['id']}/sets",
            json={"exercise_id": exercise_id, "weight": weight, "reps": reps},
        )
    ).json()
    return session["id"], workout_set["id"]


async def test_insight_generated_and_labeled(client):
    squat = await _squat_id(client)
    session_id, _ = await _log(client, date.today(), squat, 315, 5)

    with insight_agent.override(model=TestModel()):
        resp = await client.get(f"/api/ai/insight/{session_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ai_generated"] is True
    assert body["cached"] is False
    assert body["insight"]["headline"]


async def test_insight_cached_on_second_call(client):
    squat = await _squat_id(client)
    session_id, _ = await _log(client, date.today(), squat, 315, 5)

    with insight_agent.override(model=TestModel()):
        first = (await client.get(f"/api/ai/insight/{session_id}")).json()

    # No override here: a real model call would fail (placeholder API key),
    # so a 200 proves the response came from the cache.
    second = (await client.get(f"/api/ai/insight/{session_id}")).json()
    assert second["cached"] is True
    assert second["insight"] == first["insight"]


async def test_insight_cache_busted_by_data_change(client):
    squat = await _squat_id(client)
    session_id, set_id = await _log(client, date.today(), squat, 315, 5)

    with insight_agent.override(model=TestModel()):
        await client.get(f"/api/ai/insight/{session_id}")
        await client.patch(f"/api/sets/{set_id}", json={"weight": 320})
        resp = (await client.get(f"/api/ai/insight/{session_id}")).json()
    assert resp["cached"] is False


async def test_recommendations_progressive_overload(client):
    squat = await _squat_id(client)
    today = date.today()
    await _log(client, today - timedelta(days=14), squat, 305, 5)
    await _log(client, today - timedelta(days=7), squat, 310, 5)
    await _log(client, today - timedelta(days=2), squat, 315, 5)

    with recommendation_agent.override(model=TestModel()):
        resp = await client.get("/api/ai/recommendations")
    assert resp.status_code == 200
    body = resp.json()
    target = next(t for t in body["targets"] if t["exercise_name"] == "Squat")
    assert target["action"] == "increase"
    assert target["target_weight"] == 325  # 315 + 10 lb squat increment
    assert target["rep_scheme"] == "1×5"
    assert body["narrative"]["per_lift"] is not None


async def test_recommendations_deload_after_two_declines(client):
    squat = await _squat_id(client)
    today = date.today()
    await _log(client, today - timedelta(days=14), squat, 315, 5)
    await _log(client, today - timedelta(days=7), squat, 305, 5)
    await _log(client, today - timedelta(days=2), squat, 295, 5)

    with recommendation_agent.override(model=TestModel()):
        body = (await client.get("/api/ai/recommendations")).json()
    target = next(t for t in body["targets"] if t["exercise_name"] == "Squat")
    assert target["action"] == "deload"
    assert target["target_weight"] == 265  # round_to_5(0.9 * 295)


async def test_recommendations_empty_without_data(client):
    body = (await client.get("/api/ai/recommendations")).json()
    assert body["targets"] == []
    assert "No recent training" in body["narrative"]["overall_note"]


async def test_weekly_digest(client):
    squat = await _squat_id(client)
    await _log(client, date.today(), squat, 315, 5)

    with digest_agent.override(model=TestModel()):
        resp = await client.get("/api/ai/digest")
    assert resp.status_code == 200
    body = resp.json()
    iso = date.today().isocalendar()
    assert body["week"] == f"{iso.year}-W{iso.week:02d}"
    assert body["digest"]["summary"]
    assert body["ai_generated"] is True
