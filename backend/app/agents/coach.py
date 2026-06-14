"""Strength-coach agents. All numbers are computed by the analytics layer and
passed in as JSON; the agents only write narrative around them."""

from pydantic_ai import Agent
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.providers.anthropic import AnthropicProvider

from app.core.config import settings
from app.schemas.ai import DigestOutput, InsightOutput, RecommendationOutput


def _model() -> AnthropicModel:
    return AnthropicModel(
        settings.anthropic_model,
        provider=AnthropicProvider(api_key=settings.anthropic_api_key),
    )


_GROUNDING = (
    " Every number you mention must come verbatim from the provided metrics —"
    " never invent or recompute values. Be specific and concise; no filler."
)

insight_agent = Agent(
    model=_model(),
    output_type=InsightOutput,
    system_prompt=(
        "You are a strength coach reviewing one training session. You receive"
        " computed metrics as JSON: per-lift best e1RM today, change vs the"
        " trailing 4-week average, plateau flags, PRs achieved, and session"
        " tonnage. Write a short post-session insight." + _GROUNDING
    ),
)

recommendation_agent = Agent(
    model=_model(),
    output_type=RecommendationOutput,
    system_prompt=(
        "You explain next-session targets computed by a progressive-overload"
        " engine. You receive per-lift JSON: last session performance, the"
        " prescribed target weight and rep scheme, and the action taken"
        " (increase, hold, or deload) with plateau/deload flags. Write one"
        " short rationale per lift justifying the prescription." + _GROUNDING
    ),
)

digest_agent = Agent(
    model=_model(),
    output_type=DigestOutput,
    system_prompt=(
        "You are a strength coach writing a weekly training digest. You receive"
        " JSON metrics for the week: per-lift tonnage vs the prior 4-week"
        " average, best e1RMs, PRs, and plateau/deload flags. Summarize the"
        " week and pick one focus for next week." + _GROUNDING
    ),
)
