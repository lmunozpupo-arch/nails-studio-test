from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from auth import require_admin
from database import db
from models import ProfessionalCreate, ProfessionalUpdate, new_id

router = APIRouter(prefix="/professionals", tags=["professionals"])


def serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_professionals(
    search: str = Query(default=""),
    active: str = Query(default="all"),
    user: dict = Depends(require_admin),
):
    query = {}
    if search:
        regex = {"$regex": search, "$options": "i"}
        query["$or"] = [{"first_name": regex}, {"last_name": regex}, {"specialty": regex}]
    if active in ("true", "false"):
        query["active"] = active == "true"
    return await db.professionals.find(query, {"_id": 0}).sort("first_name", 1).to_list(2000)


@router.post("", status_code=201)
async def create_professional(data: ProfessionalCreate, user: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": new_id(), **data.model_dump(), "created_at": now, "updated_at": now}
    await db.professionals.insert_one(doc)
    return serialize(doc)


@router.get("/{professional_id}")
async def get_professional(professional_id: str, user: dict = Depends(require_admin)):
    doc = await db.professionals.find_one({"id": professional_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="not_found")
    return doc


@router.put("/{professional_id}")
async def update_professional(professional_id: str, data: ProfessionalUpdate, user: dict = Depends(require_admin)):
    existing = await db.professionals.find_one({"id": professional_id})
    if not existing:
        raise HTTPException(status_code=404, detail="not_found")
    update = {**data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.professionals.update_one({"id": professional_id}, {"$set": update})
    full_name = f"{data.first_name} {data.last_name}".strip()
    await db.appointments.update_many({"professional_id": professional_id}, {"$set": {"professional_name": full_name}})
    return serialize(await db.professionals.find_one({"id": professional_id}))


@router.delete("/{professional_id}")
async def delete_professional(professional_id: str, user: dict = Depends(require_admin)):
    result = await db.professionals.delete_one({"id": professional_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="not_found")
    return {"ok": True}
