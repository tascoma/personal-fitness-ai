from datetime import date

from app.models import WorkoutSession, WorkoutSet


async def test_list_returns_seeded_exercises(client):
    resp = await client.get("/api/exercises")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 11
    names = {e["name"] for e in data}
    assert {"Squat", "Bench Press", "Deadlift", "Overhead Press"} <= names


async def test_create_custom_exercise(client):
    resp = await client.post(
        "/api/exercises", json={"name": "Pause Squat", "is_compound": True, "increment": 10}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["is_custom"] is True
    assert body["increment"] == 10


async def test_create_duplicate_name_conflict(client):
    resp = await client.post("/api/exercises", json={"name": "Squat"})
    assert resp.status_code == 409


async def test_update_exercise_increment(client):
    resp = await client.get("/api/exercises")
    squat = next(e for e in resp.json() if e["name"] == "Squat")
    resp = await client.patch(f"/api/exercises/{squat['id']}", json={"increment": 7.5})
    assert resp.status_code == 200
    assert resp.json()["increment"] == 7.5


async def test_delete_unused_exercise(client):
    created = (await client.post("/api/exercises", json={"name": "Zercher Squat"})).json()
    resp = await client.delete(f"/api/exercises/{created['id']}")
    assert resp.status_code == 204
    resp = await client.get(f"/api/exercises/{created['id']}")
    assert resp.status_code == 404


async def test_delete_exercise_with_sets_conflict(client, db_session):
    squat_id = next(
        e["id"] for e in (await client.get("/api/exercises")).json() if e["name"] == "Squat"
    )
    session = WorkoutSession(date=date(2026, 6, 1))
    db_session.add(session)
    await db_session.flush()
    db_session.add(WorkoutSet(session_id=session.id, exercise_id=squat_id, weight=225, reps=5))
    await db_session.commit()

    resp = await client.delete(f"/api/exercises/{squat_id}")
    assert resp.status_code == 409
