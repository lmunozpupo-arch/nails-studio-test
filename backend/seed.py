import os
from datetime import datetime, timedelta, timezone

from auth import hash_password, new_user_id
from database import db


async def seed_database():
    now = datetime.now(timezone.utc).isoformat()

    # Admin user
    admin_email = os.environ.get("ADMIN_EMAIL", "lmunozpupo@gmail.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "NaislAdmin2024!")
    existing = await db.users.find_one({"email": admin_email}, {"_id": 0})
    if not existing:
        await db.users.insert_one({
            "user_id": new_user_id(),
            "email": admin_email,
            "name": "Administradora",
            "picture": "",
            "role": "admin",
            "language": "pt-BR",
            "auth_provider": "password",
            "password_hash": hash_password(admin_password),
            "created_at": now,
        })

    # Settings singleton
    if not await db.settings.find_one({"key": "salon"}, {"_id": 0}):
        await db.settings.insert_one({
            "key": "salon",
            "salon_name": "Nais'l Designer M&A Studio",
            "phone": "",
            "email": admin_email,
            "address": "",
            "opening_time": "09:00",
            "closing_time": "19:00",
        })

    # Demo data (only if collections are empty)
    if await db.services.count_documents({}) == 0:
        services = [
            {"id": "svc_manicure", "name": "Manicure", "description": "Manicure tradicional com esmaltação", "price": 45.0, "duration_minutes": 60, "active": True},
            {"id": "svc_pedicure", "name": "Pedicure", "description": "Pedicure completa", "price": 55.0, "duration_minutes": 75, "active": True},
            {"id": "svc_nailart", "name": "Nail Art", "description": "Decoração artística personalizada", "price": 80.0, "duration_minutes": 90, "active": True},
            {"id": "svc_extensao", "name": "Extensão de Unhas", "description": "Alongamento em gel ou fibra", "price": 150.0, "duration_minutes": 120, "active": True},
            {"id": "svc_manutencao", "name": "Manutenção", "description": "Manutenção de alongamento", "price": 90.0, "duration_minutes": 90, "active": True},
        ]
        for s in services:
            s.update({"created_at": now, "updated_at": now})
        await db.services.insert_many(services)

    if await db.professionals.count_documents({}) == 0:
        pros = [
            {"id": "pro_ana", "first_name": "Ana", "last_name": "Silva", "phone": "+55 11 98888-0001", "email": "ana@naisl.com", "specialty": "Nail Art", "notes": "", "active": True},
            {"id": "pro_maria", "first_name": "Maria", "last_name": "Souza", "phone": "+55 11 98888-0002", "email": "maria@naisl.com", "specialty": "Extensão de Unhas", "notes": "", "active": True},
            {"id": "pro_julia", "first_name": "Júlia", "last_name": "Costa", "phone": "+55 11 98888-0003", "email": "julia@naisl.com", "specialty": "Manicure e Pedicure", "notes": "", "active": True},
        ]
        for p in pros:
            p.update({"created_at": now, "updated_at": now})
        await db.professionals.insert_many(pros)

    if await db.clients.count_documents({}) == 0:
        clients = [
            {"id": "cli_beatriz", "first_name": "Beatriz", "last_name": "Oliveira", "phone": "+55 11 97777-0001", "email": "beatriz@email.com", "birth_date": "1990-05-12", "notes": "", "active": True},
            {"id": "cli_camila", "first_name": "Camila", "last_name": "Santos", "phone": "+55 11 97777-0002", "email": "camila@email.com", "birth_date": "1985-11-03", "notes": "Prefere esmaltes claros", "active": True},
            {"id": "cli_fernanda", "first_name": "Fernanda", "last_name": "Lima", "phone": "+55 11 97777-0003", "email": "fernanda@email.com", "birth_date": "1995-02-20", "notes": "", "active": True},
            {"id": "cli_patricia", "first_name": "Patrícia", "last_name": "Almeida", "phone": "+55 11 97777-0004", "email": "patricia@email.com", "birth_date": "1988-08-30", "notes": "", "active": True},
        ]
        for c in clients:
            c.update({"created_at": now, "updated_at": now})
        await db.clients.insert_many(clients)

    if await db.appointments.count_documents({}) == 0:
        today = datetime.now(timezone.utc).date()

        def d(offset):
            return (today + timedelta(days=offset)).isoformat()

        appts = [
            {"id": "apt_1", "client_id": "cli_beatriz", "service_id": "svc_manicure", "professional_id": "pro_ana",
             "client_name": "Beatriz Oliveira", "service_name": "Manicure", "professional_name": "Ana Silva",
             "date": d(0), "start_time": "10:00", "end_time": "11:00", "status": "confirmed", "price": 45.0, "notes": ""},
            {"id": "apt_2", "client_id": "cli_camila", "service_id": "svc_extensao", "professional_id": "pro_maria",
             "client_name": "Camila Santos", "service_name": "Extensão de Unhas", "professional_name": "Maria Souza",
             "date": d(0), "start_time": "14:00", "end_time": "16:00", "status": "pending", "price": 150.0, "notes": ""},
            {"id": "apt_3", "client_id": "cli_fernanda", "service_id": "svc_nailart", "professional_id": "pro_ana",
             "client_name": "Fernanda Lima", "service_name": "Nail Art", "professional_name": "Ana Silva",
             "date": d(1), "start_time": "09:30", "end_time": "11:00", "status": "pending", "price": 80.0, "notes": ""},
            {"id": "apt_4", "client_id": "cli_patricia", "service_id": "svc_pedicure", "professional_id": "pro_julia",
             "client_name": "Patrícia Almeida", "service_name": "Pedicure", "professional_name": "Júlia Costa",
             "date": d(-1), "start_time": "15:00", "end_time": "16:15", "status": "completed", "price": 55.0, "notes": ""},
            {"id": "apt_5", "client_id": "cli_beatriz", "service_id": "svc_manutencao", "professional_id": "pro_maria",
             "client_name": "Beatriz Oliveira", "service_name": "Manutenção", "professional_name": "Maria Souza",
             "date": d(3), "start_time": "11:00", "end_time": "12:30", "status": "pending", "price": 90.0, "notes": ""},
        ]
        for a in appts:
            a.update({"created_at": now, "updated_at": now})
        await db.appointments.insert_many(appts)

    if await db.payments.count_documents({}) == 0:
        today = datetime.now(timezone.utc).date()
        payments = [
            {"id": "pay_1", "client_id": "cli_patricia", "appointment_id": "apt_4", "client_name": "Patrícia Almeida",
             "amount": 55.0, "method": "pix", "date": (today - timedelta(days=1)).isoformat(), "status": "paid", "notes": ""},
            {"id": "pay_2", "client_id": "cli_beatriz", "appointment_id": None, "client_name": "Beatriz Oliveira",
             "amount": 45.0, "method": "credit_card", "date": today.isoformat(), "status": "paid", "notes": ""},
            {"id": "pay_3", "client_id": "cli_camila", "appointment_id": None, "client_name": "Camila Santos",
             "amount": 150.0, "method": "cash", "date": today.isoformat(), "status": "pending", "notes": ""},
        ]
        for p in payments:
            p.update({"created_at": now, "updated_at": now})
        await db.payments.insert_many(payments)
