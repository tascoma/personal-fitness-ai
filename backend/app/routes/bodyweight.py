from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.databases import get_db
from app.schemas.bodyweight import BodyweightEntryCreate, BodyweightEntryRead
from app.services import bodyweight as svc

router = APIRouter(prefix="/bodyweight", tags=["bodyweight"])


@router.get("", response_model=list[BodyweightEntryRead])
async def list_bodyweight(db: AsyncSession = Depends(get_db)):
    return await svc.list_entries(db)


@router.post("", response_model=BodyweightEntryRead)
async def log_bodyweight(data: BodyweightEntryCreate, db: AsyncSession = Depends(get_db)):
    return await svc.log_weight(db, data.date, data.weight)


@router.delete("/{entry_id}", status_code=204)
async def delete_bodyweight(entry_id: int, db: AsyncSession = Depends(get_db)):
    if not await svc.delete_entry(db, entry_id):
        raise HTTPException(status_code=404, detail="Bodyweight entry not found")
