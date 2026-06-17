"""Estimated one-rep-max formulas. Weight is always in lbs."""


def epley(weight: float, reps: int) -> float:
    if reps <= 1:
        return weight
    return weight * (1 + reps / 30)


def brzycki(weight: float, reps: int) -> float:
    if reps <= 1:
        return weight
    # Formula is undefined at reps >= 37; clamp — nobody's maxing on 37+ rep sets.
    return weight * 36 / (37 - min(reps, 36))


def compute_both(weight: float, reps: int) -> tuple[float, float]:
    return round(epley(weight, reps), 2), round(brzycki(weight, reps), 2)


def pick(e1rm_epley: float, e1rm_brzycki: float, formula: str) -> float:
    return e1rm_brzycki if formula == "brzycki" else e1rm_epley
