"""Auth: /api/teacher/login, /api/teacher/me, /api/teacher/preview/{id}"""
import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..auth import (
    create_access_token,
    get_current_user,
    require_admin,
    verify_password,
)
from ..db import db


router = APIRouter(tags=["teacher_app:auth"])


class LoginBody(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


def _norm(u: str) -> str:
    return "".join(ch for ch in (u or "") if ord(ch) >= 32).strip().lower()


@router.post("/login")
async def login(body: LoginBody):
    u_norm = _norm(body.username)
    if not u_norm:
        raise HTTPException(status_code=400, detail="اسم المستخدم مطلوب")

    # Admin
    admin_username = os.environ.get("TEACHER_APP_ADMIN_USERNAME", "bsn.1988")
    if u_norm == _norm(admin_username):
        admin_doc = await db.admins.find_one({"username": admin_username})
        if admin_doc and verify_password(
            body.password, admin_doc.get("password_hash", "")
        ):
            token = create_access_token(
                user_id="admin",
                role="admin",
                username=admin_username,
                actor_role="admin",
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

    # Teacher
    teacher = await db.teachers.find_one({"username_lower": u_norm}, {"_id": 0})
    if not teacher:
        raise HTTPException(status_code=401, detail="اسم المستخدم غير موجود")
    if not teacher.get("active", True):
        raise HTTPException(
            status_code=403, detail="هذا الحساب معطّل. تواصلي مع المدير."
        )
    if not verify_password(body.password, teacher.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="كلمة المرور غير صحيحة")

    token = create_access_token(
        user_id=teacher["id"],
        role="teacher",
        username=teacher["username"],
        actor_role="teacher",
    )
    teacher.pop("password_hash", None)
    teacher["role"] = "teacher"
    teacher["actor_role"] = "teacher"
    return {"token": token, "user": teacher}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/preview/{teacher_id}")
async def preview_as_teacher(
    teacher_id: str, _admin: dict = Depends(require_admin)
):
    t = await db.teachers.find_one(
        {"id": teacher_id}, {"_id": 0, "password_hash": 0}
    )
    if not t:
        raise HTTPException(status_code=404, detail="معلمة غير موجودة")
    token = create_access_token(
        user_id=t["id"],
        role="teacher",
        username=t["username"],
        actor_role="admin",  # admin-acting-as-teacher
    )
    t["role"] = "teacher"
    t["actor_role"] = "admin"
    return {"token": token, "user": t}
