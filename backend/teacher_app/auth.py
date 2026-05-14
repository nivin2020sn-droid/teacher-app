"""Authentication helpers for teacher_app — fully self-contained.

Uses TEACHER_APP_JWT_SECRET to keep its tokens distinct from any other auth
that may exist in the host backend (kvd).
"""
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_MINUTES = 60 * 24 * 7  # 7 days


def _secret() -> str:
    s = (
        os.environ.get("TEACHER_APP_JWT_SECRET")
        or os.environ.get("JWT_SECRET")
    )
    if not s:
        raise RuntimeError(
            "TEACHER_APP_JWT_SECRET (or JWT_SECRET) is not configured"
        )
    return s


# --- password hashing ---
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# --- JWT ---
def create_access_token(
    *, user_id: str, role: str, username: str, actor_role: Optional[str] = None
) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "actor_role": actor_role or role,
        "username": username,
        "type": "access",
        # Issuer claim helps the host backend recognise these tokens.
        "iss": "teacher_app",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc)
        + timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES),
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# --- FastAPI dependencies ---
def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return request.cookies.get("ta_access_token")  # ta_ prefix to avoid host clash


async def get_current_user(request: Request) -> dict:
    from .db import db

    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    if payload.get("type") != "access" or payload.get("iss") != "teacher_app":
        raise HTTPException(status_code=401, detail="Invalid token")

    role = payload.get("role")
    actor_role = payload.get("actor_role", role)
    user_id = payload.get("sub")

    if role == "admin":
        return {
            "id": user_id,
            "username": payload.get("username"),
            "role": "admin",
            "actor_role": "admin",
            "name": "المدير العام",
            "subtitle": "إدارة النظام",
            "avatar": None,
            "active": True,
        }

    if role == "teacher":
        doc = await db.teachers.find_one(
            {"id": user_id}, {"_id": 0, "password_hash": 0}
        )
        if not doc:
            raise HTTPException(status_code=401, detail="User not found")
        if not doc.get("active", True):
            raise HTTPException(status_code=403, detail="Account disabled")
        doc["role"] = "teacher"
        doc["actor_role"] = actor_role
        return doc

    raise HTTPException(status_code=401, detail="Invalid role")


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Real admin only — admin-previewing-teacher must exit preview first."""
    if user.get("role") != "admin" or user.get("actor_role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user
