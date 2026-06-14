import pytest


async def _setup(client, exercise="Squat"):
    exercise_id = next(
        e["id"] for e in (await client.get("/api/exercises")).json() if e["name"] == exercise
    )
    session = (await client.post("/api/sessions", json={"date": "2026-06-10"})).json()
    return exercise_id, session["id"]


async def test_create_set_computes_e1rm(client):
    exercise_id, session_id = await _setup(client)
    resp = await client.post(
        f"/api/sessions/{session_id}/sets",
        json={"exercise_id": exercise_id, "weight": 225, "reps": 5},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["e1rm_epley"] == pytest.approx(262.5)
    assert body["e1rm_brzycki"] == pytest.approx(253.12)
    assert body["set_number"] == 1


async def test_set_number_auto_increments_per_exercise(client):
    exercise_id, session_id = await _setup(client)
    for _ in range(2):
        await client.post(
            f"/api/sessions/{session_id}/sets",
            json={"exercise_id": exercise_id, "weight": 225, "reps": 5},
        )
    resp = await client.post(
        f"/api/sessions/{session_id}/sets",
        json={"exercise_id": exercise_id, "weight": 225, "reps": 5},
    )
    assert resp.json()["set_number"] == 3


async def test_rpe_validation(client):
    exercise_id, session_id = await _setup(client)
    resp = await client.post(
        f"/api/sessions/{session_id}/sets",
        json={"exercise_id": exercise_id, "weight": 225, "reps": 5, "rpe": 11},
    )
    assert resp.status_code == 422


async def test_update_set_recomputes_e1rm(client):
    exercise_id, session_id = await _setup(client)
    created = (
        await client.post(
            f"/api/sessions/{session_id}/sets",
            json={"exercise_id": exercise_id, "weight": 225, "reps": 5},
        )
    ).json()
    resp = await client.patch(f"/api/sets/{created['id']}", json={"weight": 235, "reps": 3})
    assert resp.status_code == 200
    assert resp.json()["e1rm_epley"] == pytest.approx(258.5)


async def test_delete_set(client):
    exercise_id, session_id = await _setup(client)
    created = (
        await client.post(
            f"/api/sessions/{session_id}/sets",
            json={"exercise_id": exercise_id, "weight": 225, "reps": 5},
        )
    ).json()
    assert (await client.delete(f"/api/sets/{created['id']}")).status_code == 204
    session = (await client.get(f"/api/sessions/{session_id}")).json()
    assert session["sets"] == []


async def test_create_set_unknown_exercise_404(client):
    _, session_id = await _setup(client)
    resp = await client.post(
        f"/api/sessions/{session_id}/sets", json={"exercise_id": 9999, "weight": 100, "reps": 5}
    )
    assert resp.status_code == 404
