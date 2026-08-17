from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from auth import require_admin
from database import db
from models import PAYMENT_METHODS, PAYMENT_STATUSES, PaymentCreate, PaymentUpdate, new_id

router = APIRouter(prefix="/payments", tags=["payments"])


def serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


async def validate_payment(data):
    if data.method not in PAYMENT_METHODS:
        raise HTTPException(status_code=400, detail="invalid_payment_method")
    if data.status not in PAYMENT_STATUSES:
        raise HTTPException(status_code=400, detail="invalid_status")
    client = await db.clients.find_one({"id": data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=400, detail="client_not_found")
    if data.appointment_id:
        appt = await db.appointments.find_one({"id": data.appointment_id}, {"_id": 0})
        if not appt:
            raise HTTPException(status_code=400, detail="appointment_not_found")
    return client


@router.get("")
async def list_payments(
    date_from: str = Query(default=""),
    date_to: str = Query(default=""),
    method: str = Query(default=""),
    status: str = Query(default=""),
    user: dict = Depends(require_admin),
):
    query = {}
    if date_from or date_to:
        date_q = {}
        if date_from:
            date_q["$gte"] = date_from
        if date_to:
            date_q["$lte"] = date_to
        query["date"] = date_q
    if method:
        query["method"] = method
    if status:
        query["status"] = status
    return await db.payments.find(query, {"_id": 0}).sort("date", -1).to_list(5000)


@router.post("", status_code=201)
async def create_payment(data: PaymentCreate, user: dict = Depends(require_admin)):
    client = await validate_payment(data)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": new_id(),
        **data.model_dump(),
        "client_name": f"{client['first_name']} {client['last_name']}".strip(),
        "created_at": now,
        "updated_at": now,
    }
    await db.payments.insert_one(doc)
    return serialize(doc)


@router.get("/{payment_id}")
async def get_payment(payment_id: str, user: dict = Depends(require_admin)):
    doc = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="not_found")
    return doc


@router.put("/{payment_id}")
async def update_payment(payment_id: str, data: PaymentUpdate, user: dict = Depends(require_admin)):
    existing = await db.payments.find_one({"id": payment_id})
    if not existing:
        raise HTTPException(status_code=404, detail="not_found")
    client = await validate_payment(data)
    update = {
        **data.model_dump(),
        "client_name": f"{client['first_name']} {client['last_name']}".strip(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payments.update_one({"id": payment_id}, {"$set": update})
    return serialize(await db.payments.find_one({"id": payment_id}))


@router.delete("/{payment_id}")
async def delete_payment(payment_id: str, user: dict = Depends(require_admin)):
    result = await db.payments.delete_one({"id": payment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="not_found")
    return {"ok": True}
