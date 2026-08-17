from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from auth import require_admin
from database import db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def dashboard_stats(user: dict = Depends(require_admin)):
    today = datetime.now(timezone.utc).date()
    today_str = today.isoformat()
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    month_start = today.replace(day=1).isoformat()

    total_clients = await db.clients.count_documents({})
    active_professionals = await db.professionals.count_documents({"active": True})
    total_services = await db.services.count_documents({"active": True})

    today_appointments = await db.appointments.find(
        {"date": today_str}, {"_id": 0}
    ).sort("start_time", 1).to_list(500)

    pending_count = await db.appointments.count_documents(
        {"date": {"$gte": today_str}, "status": "pending"}
    )
    confirmed_count = await db.appointments.count_documents(
        {"date": today_str, "status": "confirmed"}
    )

    async def revenue(date_q):
        pipeline = [
            {"$match": {"status": "paid", "date": date_q}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        ]
        result = await db.payments.aggregate(pipeline).to_list(1)
        if result:
            return result[0]["total"], result[0]["count"]
        return 0.0, 0

    revenue_today, payments_today = await revenue(today_str)
    revenue_week, _ = await revenue({"$gte": week_start})
    revenue_month, _ = await revenue({"$gte": month_start})

    completed_count = await db.appointments.count_documents({"status": "completed"})

    return {
        "total_clients": total_clients,
        "active_professionals": active_professionals,
        "total_services": total_services,
        "today_appointments_count": len(today_appointments),
        "pending_count": pending_count,
        "confirmed_today": confirmed_count,
        "revenue_today": revenue_today,
        "revenue_week": revenue_week,
        "revenue_month": revenue_month,
        "payments_today": payments_today,
        "completed_count": completed_count,
        "today_appointments": today_appointments,
    }
