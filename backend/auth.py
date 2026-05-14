"""Authentication helpers: bcrypt hashing, JWT, current-user dependency, role guards."""
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_MINUTES = 60 * 24 * 7  # 7 days — practical for a school PWA


def _secret() -> str:
    s = os.environ.get("JWT_SECRET")
    if not s:
        raise RuntimeError("JWT_SECRET not set")
    return s


# -------- password hashing --------
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# -------- JWT --------
def create_access_token(*, user_id: str, role: str, username: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "username": username,
        "type": "access",
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


# -------- FastAPI dependencies --------
def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    # cookie fallback (kept for future)
    return request.cookies.get("access_token")


async def get_current_user(request: Request) -> dict:
    """Resolve the authenticated user (admin or teacher).

    Returns a dict with: id, username, role, name, subtitle, avatar, active,
    plus a virtual `actor_role` to know whether the caller is admin previewing
    a teacher (set via /api/auth/preview/{id}).
    """
    from db import db  # local import to avoid circular dep at module load

    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    role = payload.get("role")
    user_id = payload.get("sub")

    if role == "admin":
        return {
            "id": user_id,
            "username": payload.get("username"),
            "role": "admin",
            "name": "المدير العام",
            "subtitle": "إدارة النظام",
            "avatar": None,
            "active": True,
            "actor_role": "admin",
        }

    if role == "teacher":
        doc = await db.teachers.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not doc:
            raise HTTPException(status_code=401, detail="User not found")
        if not doc.get("active", True):
            raise HTTPException(status_code=403, detail="Account disabled")
        doc["role"] = "teacher"
        doc["actor_role"] = payload.get("actor_role", "teacher")
        return doc

    raise HTTPException(status_code=401, detail="Invalid role")


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Only the real admin (not admin-previewing-teacher) may pass."""
    if user.get("actor_role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def require_teacher_or_admin(user: dict = Depends(get_current_user)) -> dict:
    return user


def teacher_scope_id(user: dict) -> str:
    """Resource owner id for the current request.

    - real admin (no preview): returns 'admin' — admin has no own resources;
      use only when admins are explicitly authorised.
    - teacher (or admin previewing teacher): returns the teacher's id, so the
      same scoped routes work transparently for previews.
    """
    if user.get("role") == "teacher":
        return user["id"]
    if user.get("role") == "admin" and user.get("actor_role") == "admin":
        return "admin"
    return user["id"]
