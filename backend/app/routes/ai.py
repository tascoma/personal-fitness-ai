import json
from datetime import date as date_type

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.coach import digest_agent, insight_agent, recommendation_agent
from app.databases import get_db
from app.schemas.ai import (
    DigestOutput,
    DigestResponse,
    InsightOutput,
    InsightResponse,
    RecommendationOutput,
    RecommendationsResponse,
)
from app.services.ai_cache import get_or_create
from app.services.ai_metrics import recommendation_targets, session_metrics, weekly_metrics

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/insight/{session_id}", response_model=InsightResponse)
async def insight(session_id: int, refresh: bool = False, db: AsyncSession = Depends(get_db)):
    metrics = await session_metrics(db, session_id)

    async def generate() -> InsightOutput:
        result = await insight_agent.run(f"Session metrics:\n{json.dumps(metrics)}")
        return result.output

    content, cached, model = await get_or_create(db, "insight", metrics, generate, refresh)
    return InsightResponse(
        session_id=session_id, insight=InsightOutput(**content), cached=cached, model=model
    )


@router.get("/recommendations", response_model=RecommendationsResponse)
async def recommendations(refresh: bool = False, db: AsyncSession = Depends(get_db)):
    targets = await recommendation_targets(db, date_type.today())
    payload = [t.model_dump() for t in targets]

    async def generate() -> RecommendationOutput:
        if not targets:
            return RecommendationOutput(
                per_lift=[], overall_note="No recent training data — log a session to get targets."
            )
        result = await recommendation_agent.run(
            f"Next-session targets:\n{json.dumps(payload, default=str)}"
        )
        return result.output

    content, cached, model = await get_or_create(db, "recommendation", payload, generate, refresh)
    return RecommendationsResponse(
        targets=targets, narrative=RecommendationOutput(**content), cached=cached, model=model
    )


@router.get("/digest", response_model=DigestResponse)
async def digest(refresh: bool = False, db: AsyncSession = Depends(get_db)):
    metrics = await weekly_metrics(db, date_type.today())

    async def generate() -> DigestOutput:
        if not metrics["lifts"]:
            return DigestOutput(
                summary="No training logged this week yet.",
                lift_notes=[],
                focus_next_week="Get your first session of the week on the books.",
            )
        result = await digest_agent.run(f"Weekly metrics:\n{json.dumps(metrics)}")
        return result.output

    content, cached, model = await get_or_create(db, "digest", metrics, generate, refresh)
    return DigestResponse(
        week=metrics["week"], digest=DigestOutput(**content), cached=cached, model=model
    )
