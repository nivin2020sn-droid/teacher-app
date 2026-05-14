"""Auth routes: /api/auth/login, /api/auth/me, /api/auth/preview/{id}"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional

from auth import (
    create_access_token,
    get_current_user,
    require_admin,
    verify_password,
)
from db import db


router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginBody(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    token: str
    user: dict


def _norm(u: str) -> str:
    return "".join(ch for ch in (u or "") if ord(ch) >= 32).strip().lower()


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginBody):
    u_norm = _norm(body.username)
    if not u_norm:
        raise HTTPException(status_code=400, detail="اسم المستخدم مطلوب")

    # Admin first
    admin_username = os.environ.get("ADMIN_USERNAME", "bsn.1988")
    if u_norm == _norm(admin_username):
        admin_doc = await db.admins.find_one({"username": admin_username})
        if admin_doc and verify_password(
            body.password, admin_doc.get("password_hash", "")
        ):
            token = create_access_token(
                user_id="admin", role="admin", username=admin_username
            )
            return {
                "token": token,
                "user": {
                    "id": "admin",
                    "username": admin_username,
                    "role": "admin",
                    "actor_role": "admin",
                    "name": "المدير العام",
                    "subtitle": "إدارة النظام",
                    "avatar": None,
                    "active": True,
                },
            }
        raise HTTPException(status_code=401, detail="كلمة المرور غير صحيحة")

    # Teachers (case-insensitive username)
    teacher = await db.teachers.find_one(
        {"username_lower": u_norm}, {"_id": 0}
    )
    if not teacher:
        raise HTTPException(status_code=401, detail="اسم المستخدم غير موجود")
    if not teacher.get("active", True):
        raise HTTPException(
            status_code=403, detail="هذا الحساب معطّل. تواصلي مع المدير."
        )
    if not verify_password(body.password, teacher.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="كلمة المرور غير صحيحة")

    token = create_access_token(
        user_id=teacher["id"], role="teacher", username=teacher["username"]
    )
    teacher.pop("password_hash", None)
    teacher["role"] = "teacher"
    teacher["actor_role"] = "teacher"
    return {"token": token, "user": teacher}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


class PreviewResponse(BaseModel):
    token: str
    user: dict


@router.post("/preview/{teacher_id}", response_model=PreviewResponse)
async def preview_as_teacher(
    teacher_id: str, _admin: dict = Depends(require_admin)
):
    t = await db.teachers.find_one({"id": teacher_id}, {"_id": 0, "password_hash": 0})
    if not t:
        raise HTTPException(status_code=404, detail="معلمة غير موجودة")
    # Special preview token: real subject is admin acting AS teacher.
    # We encode user_id=teacher.id, role=teacher, but stamp actor_role=admin
    # so server can authorise admin-only ops while routing teacher data.
    import jwt
    from auth import ACCESS_TOKEN_TTL_MINUTES, JWT_ALGORITHM, _secret
    from datetime import timedelta

    payload = {
        "sub": t["id"],
        "role": "teacher",
        "actor_role": "admin",
        "username": t["username"],
        "type": "access",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc)
        + timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES),
    }
    token = jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)
    t["role"] = "teacher"
    t["actor_role"] = "admin"
    return {"token": token, "user": t}
