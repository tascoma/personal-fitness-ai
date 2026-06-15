"""Bodyweight-relative strength standards. Maps an e1RM ÷ bodyweight ratio to a
training tier per main barbell lift and sex. Thresholds are approximate, based on
widely-cited strength-level ratios; they are intentionally coarse buckets."""

TIERS = ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"]

# Per lift, per sex: the minimum e1RM/bodyweight ratio to *reach* each tier, in
# order Novice, Intermediate, Advanced, Elite. Below the first threshold = Beginner.
_STANDARDS: dict[str, dict[str, list[float]]] = {
    "Squat": {
        "male": [0.75, 1.25, 1.75, 2.25],
        "female": [0.50, 1.00, 1.50, 2.00],
    },
    "Bench Press": {
        "male": [0.50, 0.75, 1.25, 1.75],
        "female": [0.25, 0.50, 0.75, 1.10],
    },
    "Deadlift": {
        "male": [1.00, 1.50, 2.00, 2.50],
        "female": [0.50, 1.25, 1.75, 2.25],
    },
    "Overhead Press": {
        "male": [0.35, 0.55, 0.80, 1.10],
        "female": [0.20, 0.35, 0.55, 0.75],
    },
}


def classify(exercise_name: str, sex: str | None, e1rm: float, bodyweight: float) -> str | None:
    """Return the strength tier for a lift, or None if there's no standard for it
    (unknown lift/sex) or the inputs are unusable."""
    if not sex or bodyweight <= 0 or e1rm <= 0:
        return None
    lift = _STANDARDS.get(exercise_name)
    if lift is None:
        return None
    thresholds = lift.get(sex)
    if thresholds is None:
        return None
    ratio = e1rm / bodyweight
    tier = TIERS[0]
    for i, threshold in enumerate(thresholds):
        if ratio >= threshold:
            tier = TIERS[i + 1]
    return tier
