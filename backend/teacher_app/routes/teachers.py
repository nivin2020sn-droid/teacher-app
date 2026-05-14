"""Teachers admin CRUD."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..auth import hash_password, require_admin
from ..db import db


router = APIRouter(prefix="/teachers", tags=["teacher_app:teachers"])


def _gen_id() -> str:
    return f"t_{uuid.uuid4().hex[:10]}"


def _norm(u: str) -> str:
    return "".join(ch for ch in (u or "") if ord(ch) >= 32).strip().lower()


def _public(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if k not in ("_id", "password_hash")}


class TeacherCreate(BaseModel):
    name: str = Field(..., min_length=1)
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    subtitle: Optional[str] = ""
    avatar: Optional[str] = None
    active: bool = True


class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    subtitle: Optional[str] = None
    avatar: Optional[str] = None
    active: Optional[bool] = None


class PasswordReset(BaseModel):
    password: str = Field(..., min_length=4)


@router.get("")
async def list_teachers(_admin: dict = Depends(require_admin)):
    return await db.teachers.find({}, {"_id": 0, "password_hash": 0}).to_list(500)


@router.post("", status_code=201)
async def create_teacher(
    body: TeacherCreate, _admin: dict = Depends(require_admin)
):
    u_norm = _norm(body.username)
    if not u_norm:
        raise HTTPException(status_code=400, detail="اسم المستخدم مطلوب")
    if await db.teachers.find_one({"username_lower": u_norm}):
        raise HTTPException(status_code=409, detail="اسم المستخدم مستخدم بالفعل.")
    doc = {
        "id": _gen_id(),
        "username": body.username.strip(),
        "username_lower": u_norm,
        "password_hash": hash_password(body.password),
        "name": body.name.strip(),
        "subtitle": (body.subtitle or "").strip(),
        "avatar": body.avatar,
        "active": body.active,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.teachers.insert_one(doc)
    return _public(doc)


@router.patch("/{teacher_id}")
async def update_teacher(
    teacher_id: str, body: TeacherUpdate, _admin: dict = Depends(require_admin)
):
    teacher = await db.teachers.find_one({"id": teacher_id})
    if not teacher:
        raise HTTPException(status_code=404, detail="معلمة غير موجودة")
    update: dict = {}
    if body.name is not None:
        update["name"] = body.name.strip()
    if body.username is not None:
        u_norm = _norm(body.username)
        if u_norm != teacher.get("username_lower") and await db.teachers.find_one(
            {"username_lower": u_norm}
        ):
            raise HTTPException(status_code=409, detail="اسم المستخدم مستخدم بالفعل.")
        update["username"] = body.username.strip()
        update["username_lower"] = u_norm
    if body.subtitle is not None:
        update["subtitle"] = body.subtitle.strip()
    if "avatar" in body.model_fields_set:
        update["avatar"] = body.avatar
    if body.active is not None:
        update["active"] = body.active
    if body.password:
        update["password_hash"] = hash_password(body.password)
    if update:
        await db.teachers.update_one({"id": teacher_id}, {"$set": update})
    return await db.teachers.find_one(
        {"id": teacher_id}, {"_id": 0, "password_hash": 0}
    )


@router.post("/{teacher_id}/reset-password")
async def reset_password(
    teacher_id: str, body: PasswordReset, _admin: dict = Depends(require_admin)
):
    if not await db.teachers.find_one({"id": teacher_id}):
        raise HTTPException(status_code=404, detail="معلمة غير موجودة")
    await db.teachers.update_one(
        {"id": teacher_id}, {"$set": {"password_hash": hash_password(body.password)}}
    )
    return {"ok": True}


@router.delete("/{teacher_id}")
async def delete_teacher(
    teacher_id: str, _admin: dict = Depends(require_admin)
):
    if not await db.teachers.find_one({"id": teacher_id}):
        raise HTTPException(status_code=404, detail="معلمة غير موجودة")
    await db.teachers.delete_one({"id": teacher_id})
    await db.subjects.delete_many({"teacher_id": teacher_id})
    await db.students.delete_many({"teacher_id": teacher_id})
    return {"ok": True}
