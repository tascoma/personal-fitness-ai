from datetime import date

import pytest

from app.services.ai_metrics import dashboard_metrics, profile_context


async def _squat_id(client):
    return next(e["id"] for e in (await client.get("/api/exercises")).json() if e["name"] == "Squat")


async def test_log_list_and_upsert(client):
    await client.post("/api/bodyweight", json={"date": "2026-06-01", "weight": 185})
    await client.post("/api/bodyweight", json={"date": "2026-06-08", "weight": 183})
    # Same date again upserts rather than duplicating.
    await client.post("/api/bodyweight", json={"date": "2026-06-08", "weight": 182})

    entries = (await client.get("/api/bodyweight")).json()
    assert len(entries) == 2
    assert entries[0]["date"] == "2026-06-08"  # newest first
    assert entries[0]["weight"] == 182


async def test_delete_entry(client):
    created = (await client.post("/api/bodyweight", json={"date": "2026-06-01", "weight": 185})).json()
    assert (await client.delete(f"/api/bodyweight/{created['id']}")).status_code == 204
    assert (await client.get("/api/bodyweight")).json() == []
    assert (await client.delete("/api/bodyweight/9999")).status_code == 404


async def test_settings_expose_derived_age_and_bodyweight(client):
    await client.patch("/api/settings", json={"birth_date": "2000-06-14", "sex": "male", "height_cm": 180})
    await client.post("/api/bodyweight", json={"date": "2026-06-10", "weight": 185})
    settings = (await client.get("/api/settings")).json()
    assert settings["sex"] == "male"
    assert settings["height_cm"] == 180
    assert settings["age"] == 26  # born 2000-06-14, today 2026-06-14
    assert settings["current_bodyweight"] == 185


async def test_relative_strength_endpoint(client):
    squat = await _squat_id(client)
    session = (await client.post("/api/sessions", json={"date": "2026-06-01"})).json()
    await client.post(f"/api/sessions/{session['id']}/sets", json={"exercise_id": squat, "weight": 315, "reps": 5})

    # Without bodyweight: ratios and tiers are null.
    rs = (await client.get("/api/analytics/relative-strength")).json()
    assert rs["bodyweight"] is None
    assert rs["lifts"][0]["ratio"] is None
    assert rs["lifts"][0]["tier"] is None

    # With bodyweight + sex: ratio and tier populate.
    await client.patch("/api/settings", json={"sex": "male"})
    await client.post("/api/bodyweight", json={"date": "2026-06-01", "weight": 185})
    rs = (await client.get("/api/analytics/relative-strength")).json()
    assert rs["bodyweight"] == 185
    squat_lift = next(l for l in rs["lifts"] if l["exercise_name"] == "Squat")
    assert squat_lift["ratio"] == pytest.approx(367.5 / 185, abs=0.01)  # 315x5 Epley / bw
    assert squat_lift["tier"] in {"Intermediate", "Advanced"}


async def test_ai_metrics_include_profile_block(db_session):
    from app.schemas.user_settings import UserSettingsUpdate
    from app.services.user_settings import update_settings

    await update_settings(db_session, UserSettingsUpdate(sex="male", training_goal="Squat 405"))
    profile = await profile_context(db_session)
    assert profile["sex"] == "male"
    assert profile["training_goal"] == "Squat 405"

    metrics = await dashboard_metrics(db_session, date(2026, 6, 14))
    assert metrics["profile"]["training_goal"] == "Squat 405"
