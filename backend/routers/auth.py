from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response

from auth import (
    create_jwt,
    exchange_session_id,
    get_current_user,
    hash_password,
    new_user_id,
    public_user,
    require_admin,
    verify_password,
)
from database import db
from models import AdminCreate, ClientRegister, LoginInput, PreferencesInput, SessionInput

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register-client", status_code=201)
async def register_client(data: ClientRegister):
    email = data.email.lower()
    if await db.users.find_one({"email": email}, {"_id": 0}):
        raise HTTPException(status_code=409, detail="email_already_registered")
    client = {
        "user_id": new_user_id(),
        "email": email,
        "name": data.name.strip(),
        "picture": "",
        "role": "client",
        "language": "pt-BR",
        "auth_provider": "password",
        "password_hash": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(client)
    return {"user": public_user(client), "token": create_jwt(client["user_id"])}


@router.post("/admins", status_code=201)
async def create_admin(data: AdminCreate, user: dict = Depends(require_admin)):
    email = data.email.lower()
    if await db.users.find_one({"email": email}, {"_id": 0}):
        raise HTTPException(status_code=409, detail="email_already_registered")
    admin = {
        "user_id": new_user_id(),
        "email": email,
        "name": data.name.strip(),
        "picture": "",
        "role": "admin",
        "language": "pt-BR",
        "auth_provider": "password",
        "password_hash": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(admin)
    return public_user(admin)


@router.get("/admins")
async def list_admins(user: dict = Depends(require_admin)):
    return await db.users.find({"role": "admin"}, {"_id": 0}).sort("name", 1).to_list(500)


@router.post("/login")
async def login(data: LoginInput):
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="invalid_credentials")
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="invalid_credentials")
    token = create_jwt(user["user_id"])
    return {"token": token, "user": public_user(user)}


@router.post("/session")
async def create_session(data: SessionInput, response: Response):
    oauth_data = exchange_session_id(data.session_id)
    email = oauth_data["email"].lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user = {
            "user_id": new_user_id(),
            "email": email,
            "name": oauth_data.get("name", ""),
            "picture": oauth_data.get("picture", ""),
            "role": "admin",
            "language": "pt-BR",
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
    else:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"name": oauth_data.get("name", user.get("name", "")),
                      "picture": oauth_data.get("picture", user.get("picture", ""))}},
        )
    session_token = oauth_data["session_token"]
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie(
        "session_token", session_token,
        httponly=True, secure=True, samesite="none", path="/", max_age=7 * 86400,
    )
    return {"user": public_user(user)}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@router.put("/preferences")
async def update_preferences(data: PreferencesInput, user: dict = Depends(get_current_user)):
    if data.language not in ("pt-BR", "es", "en"):
        raise HTTPException(status_code=400, detail="invalid_language")
    await db.users.update_one(
        {"user_id": user["user_id"]}, {"$set": {"language": data.language}}
    )
    return {"ok": True}


@router.post("/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    await db.user_sessions.delete_many({"user_id": user["user_id"]})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}
