from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from auth import require_admin
from database import db
from models import ClientCreate, ClientUpdate, new_id

router = APIRouter(prefix="/clients", tags=["clients"])


def serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_clients(
    search: str = Query(default=""),
    active: str = Query(default="all"),
    user: dict = Depends(require_admin),
):
    query = {}
    if search:
        regex = {"$regex": search, "$options": "i"}
        query["$or"] = [{"first_name": regex}, {"last_name": regex},
                        {"phone": regex}, {"email": regex}]
    if active in ("true", "false"):
        query["active"] = active == "true"
    docs = await db.clients.find(query, {"_id": 0}).sort("first_name", 1).to_list(2000)
    return docs


@router.post("", status_code=201)
async def create_client(data: ClientCreate, user: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": new_id(), **data.model_dump(), "created_at": now, "updated_at": now}
    await db.clients.insert_one(doc)
    return serialize(doc)


@router.get("/{client_id}")
async def get_client(client_id: str, user: dict = Depends(require_admin)):
    doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="not_found")
    return doc


@router.put("/{client_id}")
async def update_client(client_id: str, data: ClientUpdate, user: dict = Depends(require_admin)):
    existing = await db.clients.find_one({"id": client_id})
    if not existing:
        raise HTTPException(status_code=404, detail="not_found")
    update = {**data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.clients.update_one({"id": client_id}, {"$set": update})
    # refresh snapshots in future appointments/payments
    full_name = f"{data.first_name} {data.last_name}".strip()
    await db.appointments.update_many({"client_id": client_id}, {"$set": {"client_name": full_name}})
    await db.payments.update_many({"client_id": client_id}, {"$set": {"client_name": full_name}})
    return serialize(await db.clients.find_one({"id": client_id}))


@router.delete("/{client_id}")
async def delete_client(client_id: str, user: dict = Depends(require_admin)):
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="not_found")
    return {"ok": True}
