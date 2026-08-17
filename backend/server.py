import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from database import db, client
from seed import seed_database
from routers import auth, clients, services, professionals, appointments, payments, dashboard, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.clients.create_index([("first_name", 1), ("last_name", 1)])
    await db.appointments.create_index([("professional_id", 1), ("date", 1)])
    await db.appointments.create_index([("date", 1)])
    await db.appointments.create_index([("client_id", 1)])
    await db.payments.create_index([("date", 1)])
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("session_token")
    await seed_database()
    yield
    client.close()


app = FastAPI(lifespan=lifespan)

app.include_router(auth.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(services.router, prefix="/api")
app.include_router(professionals.router, prefix="/api")
app.include_router(appointments.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(settings.router, prefix="/api")


@app.get("/api/")
async def root():
    return {"message": "SalonApp API"}


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
