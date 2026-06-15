from datetime import date, timedelta

import pytest

from app.services.analytics import (
    Prediction,
    detect_deload,
    detect_plateau,
    linear_regression,
    next_milestone,
    project_milestone,
)

# ---------- pure math ----------


def test_regression_exact_linear_fit():
    points = [(0.0, 100.0), (7.0, 107.0), (14.0, 114.0), (21.0, 121.0)]
    slope, intercept, stderr = linear_regression(points)
    assert slope == pytest.approx(1.0)
    assert intercept == pytest.approx(100.0)
    assert stderr == pytest.approx(0.0, abs=1e-9)


def test_regression_flat_series():
    slope, intercept, _ = linear_regression([(0.0, 200.0), (7.0, 200.0), (14.0, 200.0)])
    assert slope == 0.0
    assert intercept == 200.0


def test_next_milestone():
    assert next_milestone(200) == 225
    assert next_milestone(225) == 275
    assert next_milestone(410) == 455
    assert next_milestone(999) is None


def _series(start: date, weekly_values: list[float]):
    return [(start + timedelta(weeks=i), v) for i, v in enumerate(weekly_values)]


def test_projection_on_clean_trend():
    # 300 → 321 over 8 weekly points: +3/week, milestone 315 should land ~week 5
    series = _series(date(2026, 4, 1), [300, 303, 306, 309, 312, 315, 318, 321])
    pred = project_milestone(series)
    # best is 321 → next milestone 365; (365-300)/3 ≈ 21.7 weeks from origin
    assert pred.status == "ok"
    assert pred.milestone == 365
    assert pred.slope_per_week == pytest.approx(3.0, abs=0.01)
    expected = date(2026, 4, 1) + timedelta(days=round((365 - 300) / (3 / 7)))
    assert abs((pred.projected_date - expected).days) <= 2
    # exact fit → CI collapses onto the projection
    assert pred.ci_earliest <= pred.projected_date <= pred.ci_latest


def test_projection_insufficient_data():
    series = _series(date(2026, 5, 1), [300, 305, 310])
    assert project_milestone(series).status == "insufficient_data"


def test_projection_negative_trend():
    series = _series(date(2026, 4, 1), [320, 315, 310, 305, 300])
    pred = project_milestone(series)
    assert pred.status == "no_positive_trend"
    assert pred.projected_date is None


def test_projection_ignores_old_points_outside_window():
    old = [(date(2025, 1, 1), 200.0), (date(2025, 1, 8), 205.0)]
    recent = _series(date(2026, 4, 1), [300, 303, 306, 309, 312])
    pred = project_milestone(old + recent)
    assert pred.status == "ok"
    assert pred.n_points == 5


def test_plateau_detection():
    as_of = date(2026, 6, 10)
    plateaued = [
        (as_of - timedelta(days=24), 300.0),  # baseline window (21-28 days ago)
        (as_of - timedelta(days=14), 301.0),
        (as_of - timedelta(days=3), 302.0),  # recent window: +0.7% < 2%
    ]
    assert detect_plateau(plateaued, as_of) is True

    progressing = [
        (as_of - timedelta(days=24), 300.0),
        (as_of - timedelta(days=3), 310.0),  # +3.3%
    ]
    assert detect_plateau(progressing, as_of) is False

    too_little_history = [(as_of - timedelta(days=3), 300.0)]
    assert detect_plateau(too_little_history, as_of) is False


def test_deload_detection():
    base = date(2026, 6, 1)
    declining = [(base, 300.0), (base + timedelta(days=3), 295.0), (base + timedelta(days=7), 290.0)]
    assert detect_deload(declining) is True

    recovering = [(base, 300.0), (base + timedelta(days=3), 295.0), (base + timedelta(days=7), 305.0)]
    assert detect_deload(recovering) is False

    assert detect_deload(declining[:2]) is False


def test_prediction_dataclass_defaults():
    assert Prediction(status="insufficient_data").milestone is None


# ---------- API endpoints ----------


async def _log(client, session_date, exercise_id, weight, reps, is_warmup=False):
    session = (await client.post("/api/sessions", json={"date": session_date})).json()
    await client.post(
        f"/api/sessions/{session['id']}/sets",
        json={"exercise_id": exercise_id, "weight": weight, "reps": reps, "is_warmup": is_warmup},
    )


async def _squat_id(client):
    return next(e["id"] for e in (await client.get("/api/exercises")).json() if e["name"] == "Squat")


async def test_e1rm_endpoint_excludes_warmups(client):
    squat = await _squat_id(client)
    await _log(client, "2026-06-01", squat, 135, 5, is_warmup=True)
    await _log(client, "2026-06-01", squat, 315, 5)
    series = (await client.get(f"/api/analytics/e1rm?exercise_id={squat}")).json()
    assert len(series) == 1
    assert series[0]["e1rm"] == pytest.approx(367.5)  # 315x5 Epley, warm-up ignored


async def test_tonnage_endpoint_buckets_by_week(client):
    squat = await _squat_id(client)
    await _log(client, "2026-06-01", squat, 300, 5)  # ISO week 23
    await _log(client, "2026-06-03", squat, 300, 5)  # same week
    await _log(client, "2026-06-08", squat, 300, 5)  # week 24
    buckets = (await client.get(f"/api/analytics/tonnage?exercise_id={squat}")).json()
    assert buckets == [
        {"bucket": "2026-W23", "tonnage": 3000.0},
        {"bucket": "2026-W24", "tonnage": 1500.0},
    ]


async def test_prs_endpoint(client):
    squat = await _squat_id(client)
    await _log(client, "2026-06-01", squat, 315, 5)
    prs = (await client.get(f"/api/analytics/prs?exercise_id={squat}")).json()
    assert {p["record_type"] for p in prs} == {"weight", "e1rm"}


async def test_compare_endpoint(client):
    squat = await _squat_id(client)
    bench = next(
        e["id"] for e in (await client.get("/api/exercises")).json() if e["name"] == "Bench Press"
    )
    await _log(client, "2026-06-01", squat, 315, 5)
    await _log(client, "2026-06-01", bench, 225, 5)
    body = (await client.get(f"/api/analytics/compare?exercise_ids={squat},{bench}")).json()
    assert [s["exercise_name"] for s in body] == ["Squat", "Bench Press"]
    assert all(len(s["series"]) == 1 for s in body)


async def test_predictions_endpoint(client):
    squat = await _squat_id(client)
    for week, weight in enumerate([300, 305, 310, 315, 320]):
        day = date(2026, 4, 6) + timedelta(weeks=week)
        await _log(client, day.isoformat(), squat, weight, 5)
    pred = (await client.get(f"/api/analytics/predictions?exercise_id={squat}")).json()
    assert pred["status"] == "ok"
    assert pred["milestone"] == 405  # best e1rm 320x5 = 373.3 → next is 405
    assert pred["projected_date"] is not None
    assert pred["ci_earliest"] <= pred["projected_date"] <= pred["ci_latest"]


async def test_summary_endpoint_empty(client):
    summary = (await client.get("/api/analytics/summary")).json()
    assert summary["total_sessions"] == 0
    assert summary["total_tonnage"] == 0.0
    assert summary["current_streak_weeks"] == 0
    assert summary["active_pr_count"] == 0


async def test_summary_endpoint_counts_and_streak(client):
    squat = await _squat_id(client)
    today = date.today()
    # Train this week and each of the two prior weeks → 3-week streak. Each
    # session has one working set plus a warm-up (excluded from tonnage).
    for back in range(3):
        day = (today - timedelta(weeks=back)).isoformat()
        session = (await client.post("/api/sessions", json={"date": day})).json()
        await client.post(
            f"/api/sessions/{session['id']}/sets",
            json={"exercise_id": squat, "weight": 300, "reps": 5},
        )
        await client.post(
            f"/api/sessions/{session['id']}/sets",
            json={"exercise_id": squat, "weight": 135, "reps": 5, "is_warmup": True},
        )
    summary = (await client.get("/api/analytics/summary")).json()
    assert summary["total_sessions"] == 3
    assert summary["training_days"] == 3
    assert summary["current_streak_weeks"] == 3
    assert summary["sessions_this_week"] == 1
    assert summary["this_week_tonnage"] == 1500.0  # warm-up excluded
    assert summary["total_tonnage"] == 4500.0
    assert summary["active_pr_count"] >= 1


async def test_recent_prs_endpoint(client):
    squat = await _squat_id(client)
    bench = next(
        e["id"] for e in (await client.get("/api/exercises")).json() if e["name"] == "Bench Press"
    )
    await _log(client, "2026-06-01", squat, 315, 5)
    await _log(client, "2026-06-02", bench, 225, 5)
    prs = (await client.get("/api/analytics/recent-prs?limit=10")).json()
    assert len(prs) >= 2
    # Newest first; each row carries its exercise name.
    assert prs[0]["achieved_on"] >= prs[-1]["achieved_on"]
    assert {"Squat", "Bench Press"} <= {p["exercise_name"] for p in prs}
