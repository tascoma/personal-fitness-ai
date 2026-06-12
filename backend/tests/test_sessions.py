async def _exercise_id(client, name="Squat"):
    return next(e["id"] for e in (await client.get("/api/exercises")).json() if e["name"] == name)


async def test_create_and_get_session(client):
    resp = await client.post("/api/sessions", json={"date": "2026-06-10", "notes": "felt strong"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["date"] == "2026-06-10"
    assert body["sets"] == []

    resp = await client.get(f"/api/sessions/{body['id']}")
    assert resp.status_code == 200


async def test_update_session_notes(client):
    created = (await client.post("/api/sessions", json={"date": "2026-06-10"})).json()
    resp = await client.patch(f"/api/sessions/{created['id']}", json={"notes": "deload day"})
    assert resp.status_code == 200
    assert resp.json()["notes"] == "deload day"


async def test_delete_session_cascades_sets(client):
    squat = await _exercise_id(client)
    session = (await client.post("/api/sessions", json={"date": "2026-06-10"})).json()
    await client.post(
        f"/api/sessions/{session['id']}/sets",
        json={"exercise_id": squat, "weight": 225, "reps": 5},
    )
    resp = await client.delete(f"/api/sessions/{session['id']}")
    assert resp.status_code == 204
    assert (await client.get(f"/api/sessions/{session['id']}")).status_code == 404
    # PRs from that session are gone too
    assert (await client.get("/api/sessions")).json() == []


async def test_history_filters(client):
    squat = await _exercise_id(client, "Squat")
    bench = await _exercise_id(client, "Bench Press")

    s1 = (await client.post("/api/sessions", json={"date": "2026-06-01", "notes": "squat day"})).json()
    s2 = (await client.post("/api/sessions", json={"date": "2026-06-08", "notes": "bench day"})).json()
    await client.post(f"/api/sessions/{s1['id']}/sets", json={"exercise_id": squat, "weight": 225, "reps": 5})
    await client.post(f"/api/sessions/{s2['id']}/sets", json={"exercise_id": bench, "weight": 185, "reps": 5})

    all_sessions = (await client.get("/api/sessions")).json()
    assert [s["date"] for s in all_sessions] == ["2026-06-08", "2026-06-01"]  # newest first

    by_exercise = (await client.get(f"/api/sessions?exercise_id={squat}")).json()
    assert len(by_exercise) == 1 and by_exercise[0]["id"] == s1["id"]

    by_date = (await client.get("/api/sessions?from=2026-06-05")).json()
    assert len(by_date) == 1 and by_date[0]["id"] == s2["id"]

    by_text = (await client.get("/api/sessions?q=bench")).json()
    assert len(by_text) == 1 and by_text[0]["id"] == s2["id"]
