import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from auth import require_admin
from database import db
from models import (
    APPOINTMENT_STATUSES,
    AppointmentCreate,
    AppointmentStatusInput,
    AppointmentUpdate,
    new_id,
)

router = APIRouter(prefix="/appointments", tags=["appointments"])

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def to_minutes(t: str) -> int:
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def to_time_str(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


async def validate_appointment(data, exclude_id: Optional[str] = None):
    """Returns (client, service, professional, start_min, end_min) or raises."""
    if not DATE_RE.match(data.date):
        raise HTTPException(status_code=400, detail="invalid_date")
    if not TIME_RE.match(data.start_time):
        raise HTTPException(status_code=400, detail="invalid_time")

    client = await db.clients.find_one({"id": data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=400, detail="client_not_found")
    service = await db.services.find_one({"id": data.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=400, detail="service_not_found")
    professional = await db.professionals.find_one({"id": data.professional_id}, {"_id": 0})
    if not professional:
        raise HTTPException(status_code=400, detail="professional_not_found")

    start_min = to_minutes(data.start_time)
    end_min = start_min + int(service["duration_minutes"])
    if end_min > 24 * 60:
        raise HTTPException(status_code=400, detail="invalid_time")

    # conflict check: same professional, same date, overlapping interval, not cancelled
    query = {
        "professional_id": data.professional_id,
        "date": data.date,
        "status": {"$ne": "cancelled"},
    }
    if exclude_id:
        query["id"] = {"$ne": exclude_id}
    existing = await db.appointments.find(query, {"_id": 0}).to_list(500)
    for appt in existing:
        o_start = to_minutes(appt["start_time"])
        o_end = to_minutes(appt["end_time"])
        if start_min < o_end and end_min > o_start:
            raise HTTPException(status_code=409, detail="schedule_conflict")

    price = data.price if data.price is not None else float(service["price"])
    return client, service, professional, start_min, end_min, price


@router.get("")
async def list_appointments(
    date_from: str = Query(default=""),
    date_to: str = Query(default=""),
    professional_id: str = Query(default=""),
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
    if professional_id:
        query["professional_id"] = professional_id
    if status:
        query["status"] = status
    docs = await db.appointments.find(query, {"_id": 0}).sort(
        [("date", 1), ("start_time", 1)]
    ).to_list(5000)
    return docs


@router.post("", status_code=201)
async def create_appointment(data: AppointmentCreate, user: dict = Depends(require_admin)):
    client, service, professional, start_min, end_min, price = await validate_appointment(data)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": new_id(),
        "client_id": data.client_id,
        "service_id": data.service_id,
        "professional_id": data.professional_id,
        "client_name": f"{client['first_name']} {client['last_name']}".strip(),
        "service_name": service["name"],
        "professional_name": f"{professional['first_name']} {professional['last_name']}".strip(),
        "date": data.date,
        "start_time": data.start_time,
        "end_time": to_time_str(end_min),
        "status": "pending",
        "price": price,
        "notes": data.notes or "",
        "created_at": now,
        "updated_at": now,
    }
    await db.appointments.insert_one(doc)
    return serialize(doc)


@router.get("/{appointment_id}")
async def get_appointment(appointment_id: str, user: dict = Depends(require_admin)):
    doc = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="not_found")
    return doc


@router.put("/{appointment_id}")
async def update_appointment(appointment_id: str, data: AppointmentUpdate, user: dict = Depends(require_admin)):
    existing = await db.appointments.find_one({"id": appointment_id})
    if not existing:
        raise HTTPException(status_code=404, detail="not_found")
    client, service, professional, start_min, end_min, price = await validate_appointment(
        data, exclude_id=appointment_id
    )
    update = {
        "client_id": data.client_id,
        "service_id": data.service_id,
        "professional_id": data.professional_id,
        "client_name": f"{client['first_name']} {client['last_name']}".strip(),
        "service_name": service["name"],
        "professional_name": f"{professional['first_name']} {professional['last_name']}".strip(),
        "date": data.date,
        "start_time": data.start_time,
        "end_time": to_time_str(end_min),
        "price": price,
        "notes": data.notes or "",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if data.status and data.status in APPOINTMENT_STATUSES:
        update["status"] = data.status
    await db.appointments.update_one({"id": appointment_id}, {"$set": update})
    return serialize(await db.appointments.find_one({"id": appointment_id}))


@router.patch("/{appointment_id}/status")
async def update_status(appointment_id: str, data: AppointmentStatusInput, user: dict = Depends(require_admin)):
    if data.status not in APPOINTMENT_STATUSES:
        raise HTTPException(status_code=400, detail="invalid_status")
    existing = await db.appointments.find_one({"id": appointment_id})
    if not existing:
        raise HTTPException(status_code=404, detail="not_found")
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return serialize(await db.appointments.find_one({"id": appointment_id}))


@router.delete("/{appointment_id}")
async def delete_appointment(appointment_id: str, user: dict = Depends(require_admin)):
    result = await db.appointments.delete_one({"id": appointment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="not_found")
    return {"ok": True}
