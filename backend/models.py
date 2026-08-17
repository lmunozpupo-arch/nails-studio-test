import uuid
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


def new_id() -> str:
    return uuid.uuid4().hex


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------- Auth ----------
class LoginInput(BaseModel):
    email: EmailStr
    password: str


class AdminCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class SessionInput(BaseModel):
    session_id: str


class UserOut(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = ""
    role: str = "admin"
    language: str = "pt-BR"


class PreferencesInput(BaseModel):
    language: str


# ---------- Clients ----------
class ClientBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    phone: str = Field(default="", max_length=30)
    email: Optional[str] = Field(default="", max_length=120)
    birth_date: Optional[str] = ""
    notes: Optional[str] = ""
    active: bool = True


class ClientCreate(ClientBase):
    pass


class ClientUpdate(ClientBase):
    pass


class ClientOut(ClientBase):
    id: str
    created_at: str
    updated_at: str


# ---------- Services ----------
class ServiceBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = ""
    price: float = Field(gt=0)
    duration_minutes: int = Field(gt=0, le=1440)
    active: bool = True


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(ServiceBase):
    pass


class ServiceOut(ServiceBase):
    id: str
    created_at: str
    updated_at: str


# ---------- Professionals ----------
class ProfessionalBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    phone: str = Field(default="", max_length=30)
    email: Optional[str] = Field(default="", max_length=120)
    specialty: Optional[str] = ""
    notes: Optional[str] = ""
    active: bool = True


class ProfessionalCreate(ProfessionalBase):
    pass


class ProfessionalUpdate(ProfessionalBase):
    pass


class ProfessionalOut(ProfessionalBase):
    id: str
    created_at: str
    updated_at: str


# ---------- Appointments ----------
APPOINTMENT_STATUSES = {"pending", "confirmed", "cancelled", "completed"}


class AppointmentBase(BaseModel):
    client_id: str
    service_id: str
    professional_id: str
    date: str  # YYYY-MM-DD (salon local date)
    start_time: str  # HH:MM
    price: Optional[float] = None
    notes: Optional[str] = ""


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(AppointmentBase):
    status: Optional[str] = None


class AppointmentStatusInput(BaseModel):
    status: str


class AppointmentOut(BaseModel):
    id: str
    client_id: str
    service_id: str
    professional_id: str
    client_name: str
    service_name: str
    professional_name: str
    date: str
    start_time: str
    end_time: str
    status: str
    price: float
    notes: str
    created_at: str
    updated_at: str


# ---------- Payments ----------
PAYMENT_METHODS = {"cash", "pix", "debit_card", "credit_card"}
PAYMENT_STATUSES = {"paid", "pending"}


class PaymentBase(BaseModel):
    client_id: str
    appointment_id: Optional[str] = None
    amount: float = Field(gt=0)
    method: str
    date: str  # YYYY-MM-DD
    status: str = "paid"
    notes: Optional[str] = ""


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(PaymentBase):
    pass


class PaymentOut(BaseModel):
    id: str
    client_id: str
    appointment_id: Optional[str]
    client_name: str
    amount: float
    method: str
    date: str
    status: str
    notes: str
    created_at: str
    updated_at: str


# ---------- Settings ----------
class SalonSettings(BaseModel):
    salon_name: str = "Nais'l Designer M&A Studio"
    phone: str = ""
    email: str = ""
    address: str = ""
    opening_time: str = "09:00"
    closing_time: str = "19:00"
