from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from auth import require_admin
from database import db
from models import ServiceCreate, ServiceUpdate, new_id

router = APIRouter(prefix="/services", tags=["services"])


def serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_services(
    search: str = Query(default=""),
    active: str = Query(default="all"),
    user: dict = Depends(require_admin),
):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if active in ("true", "false"):
        query["active"] = active == "true"
    return await db.services.find(query, {"_id": 0}).sort("name", 1).to_list(2000)


@router.post("", status_code=201)
async def create_service(data: ServiceCreate, user: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": new_id(), **data.model_dump(), "created_at": now, "updated_at": now}
    await db.services.insert_one(doc)
    return serialize(doc)


@router.get("/{service_id}")
async def get_service(service_id: str, user: dict = Depends(require_admin)):
    doc = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="not_found")
    return doc


@router.put("/{service_id}")
async def update_service(service_id: str, data: ServiceUpdate, user: dict = Depends(require_admin)):
    existing = await db.services.find_one({"id": service_id})
    if not existing:
        raise HTTPException(status_code=404, detail="not_found")
    update = {**data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.services.update_one({"id": service_id}, {"$set": update})
    await db.appointments.update_many({"service_id": service_id}, {"$set": {"service_name": data.name}})
    return serialize(await db.services.find_one({"id": service_id}))


@router.delete("/{service_id}")
async def delete_service(service_id: str, user: dict = Depends(require_admin)):
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="not_found")
    return {"ok": True}
