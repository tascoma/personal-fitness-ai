import hashlib
import json
import logging
from typing import Awaitable, Callable

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import AIOutput

logger = logging.getLogger(__name__)


def cache_key(kind: str, payload: object) -> str:
    """Stable fingerprint of the input data: same data -> same key -> no API call."""
    serialized = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(f"{kind}:{settings.anthropic_model}:{serialized}".encode()).hexdigest()


async def get_or_create(
    db: AsyncSession,
    kind: str,
    payload: object,
    generate: Callable[[], Awaitable[BaseModel]],
    refresh: bool = False,
) -> tuple[dict, bool, str]:
    """Return (content_dict, cached, model). Calls `generate` only on a miss."""
    key = cache_key(kind, payload)
    if refresh:
        await db.execute(delete(AIOutput).where(AIOutput.cache_key == key))
        await db.commit()
    else:
        row = await db.scalar(select(AIOutput).where(AIOutput.cache_key == key))
        if row is not None:
            return json.loads(row.content), True, row.model

    try:
        output = await generate()
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("AI generation failed for kind=%s", kind)
        raise HTTPException(
            status_code=502,
            detail=f"AI generation failed ({type(exc).__name__}) — check ANTHROPIC_API_KEY in .env",
        )
    db.add(
        AIOutput(
            kind=kind,
            cache_key=key,
            content=output.model_dump_json(),
            model=settings.anthropic_model,
        )
    )
    await db.commit()
    return output.model_dump(), False, settings.anthropic_model
