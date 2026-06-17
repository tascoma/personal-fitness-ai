from app.services.strength_standards import classify


def test_classify_tiers_scale_with_ratio():
    # Squat male thresholds: 0.75 / 1.25 / 1.75 / 2.25 (Novice..Elite)
    assert classify("Squat", "male", 100, 200) == "Beginner"  # 0.5
    assert classify("Squat", "male", 200, 200) == "Novice"  # 1.0
    assert classify("Squat", "male", 300, 200) == "Intermediate"  # 1.5
    assert classify("Squat", "male", 400, 200) == "Advanced"  # 2.0
    assert classify("Squat", "male", 500, 200) == "Elite"  # 2.5


def test_classify_uses_sex_specific_standards():
    # 1.0x bodyweight bench: Advanced for women, Intermediate for men.
    assert classify("Bench Press", "female", 150, 150) == "Advanced"
    assert classify("Bench Press", "male", 150, 150) == "Intermediate"


def test_classify_returns_none_for_unknown_or_missing():
    assert classify("Bicep Curl", "male", 100, 180) is None  # no standard
    assert classify("Squat", None, 300, 200) is None  # sex unknown
    assert classify("Squat", "male", 300, 0) is None  # no bodyweight
