async def test_get_default_settings(client):
    resp = await client.get("/api/settings")
    assert resp.status_code == 200
    assert resp.json() == {"unit": "lbs", "e1rm_formula": "epley"}


async def test_update_settings(client):
    resp = await client.patch("/api/settings", json={"unit": "kg", "e1rm_formula": "brzycki"})
    assert resp.status_code == 200
    assert resp.json() == {"unit": "kg", "e1rm_formula": "brzycki"}

    resp = await client.get("/api/settings")
    assert resp.json()["unit"] == "kg"


async def test_update_settings_rejects_invalid_unit(client):
    resp = await client.patch("/api/settings", json={"unit": "stone"})
    assert resp.status_code == 422
