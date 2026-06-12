import pytest

from app.services.e1rm import brzycki, compute_both, epley, pick


def test_epley_known_value():
    assert epley(225, 5) == pytest.approx(262.5)


def test_brzycki_known_value():
    assert brzycki(225, 5) == pytest.approx(253.125)


def test_single_rep_is_identity():
    assert epley(315, 1) == 315
    assert brzycki(315, 1) == 315


def test_brzycki_high_rep_clamp():
    # reps >= 37 would divide by zero or flip sign; clamped to 36
    assert brzycki(100, 50) == brzycki(100, 36)
    assert brzycki(100, 36) > 0


def test_compute_both_rounds():
    e, b = compute_both(225, 5)
    assert e == 262.5
    assert b == 253.12


def test_pick_formula():
    assert pick(262.5, 253.12, "epley") == 262.5
    assert pick(262.5, 253.12, "brzycki") == 253.12
