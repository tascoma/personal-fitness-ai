from datetime import date as date_type

from pydantic import BaseModel, Field

# ---------- agent output schemas (what the LLM must produce) ----------


class InsightOutput(BaseModel):
    """Post-session coaching insight."""

    headline: str = Field(description="One-line takeaway for the session")
    observations: list[str] = Field(
        description="2-4 specific observations grounded in the provided metrics"
    )
    encouragement: str = Field(description="One short, concrete encouragement")


class LiftRationale(BaseModel):
    exercise: str
    rationale: str = Field(description="1-2 sentences justifying the prescribed target")


class RecommendationOutput(BaseModel):
    per_lift: list[LiftRationale]
    overall_note: str = Field(description="One short note about the overall plan")


class DigestOutput(BaseModel):
    summary: str = Field(description="2-3 sentence summary of the training week")
    lift_notes: list[str] = Field(description="One short note per lift trained this week")
    focus_next_week: str = Field(description="The single most useful focus for next week")


class DashboardOutput(BaseModel):
    """Consolidated 'state of training' narrative for the dashboard."""

    headline: str = Field(description="One-line state-of-training takeaway")
    highlights: list[str] = Field(
        description="2-4 positive highlights grounded in the provided metrics"
    )
    watch_items: list[str] = Field(
        description="1-3 things to watch or improve, grounded in the metrics"
    )


# ---------- API response envelopes ----------


class AIEnvelope(BaseModel):
    ai_generated: bool = True
    cached: bool
    model: str


class InsightResponse(AIEnvelope):
    session_id: int
    insight: InsightOutput


class LiftTarget(BaseModel):
    """Deterministic next-session prescription computed by the overload engine."""

    exercise_id: int
    exercise_name: str
    last_session_date: date_type
    last_top_weight: float
    target_weight: float
    rep_scheme: str  # e.g. "3×5"
    action: str  # "increase" | "hold" | "deload"
    plateau: bool
    deload: bool


class RecommendationsResponse(AIEnvelope):
    targets: list[LiftTarget]
    narrative: RecommendationOutput


class DigestResponse(AIEnvelope):
    week: str  # e.g. "2026-W24"
    digest: DigestOutput


class DashboardResponse(AIEnvelope):
    insight: DashboardOutput
