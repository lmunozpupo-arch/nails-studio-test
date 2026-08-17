from fastapi import APIRouter, Depends, HTTPException

from auth import require_admin
from database import db
from models import SalonSettings

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
async def get_settings(user: dict = Depends(require_admin)):
    doc = await db.settings.find_one({"key": "salon"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="not_found")
    return doc


@router.put("")
async def update_settings(data: SalonSettings, user: dict = Depends(require_admin)):
    await db.settings.update_one({"key": "salon"}, {"$set": data.model_dump()}, upsert=True)
    doc = await db.settings.find_one({"key": "salon"}, {"_id": 0})
    return doc
