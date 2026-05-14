"""Subjects — teacher-scoped CRUD. Admin previewing teacher sees teacher's data."""
import uuid
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import get_current_user
from db import db


router = APIRouter(prefix="/api/subjects", tags=["subjects"])


def _gen_id() -> str:
    return f"subj_{uuid.uuid4().hex[:8]}"


class SubjectCreate(BaseModel):
    name: str = Field(..., min_length=1)
    color: str = "#7c5cff"
    background: Optional[str] = None  # base64 data URL


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    background: Optional[str] = None  # null = clear
    is_current: Optional[bool] = None


def _require_teacher_scope(user: dict) -> str:
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")
    return user["id"]


@router.get("")
async def list_subjects(user: dict = Depends(get_current_user)):
    tid = _require_teacher_scope(user)
    items = await db.subjects.find(
        {"teacher_id": tid}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return items


@router.post("", status_code=201)
async def create_subject(
    body: SubjectCreate, user: dict = Depends(get_current_user)
):
    tid = _require_teacher_scope(user)
    has_current = await db.subjects.find_one({"teacher_id": tid, "is_current": True})
    doc = {
        "id": _gen_id(),
        "teacher_id": tid,
        "name": body.name.strip(),
        "color": body.color,
        "background": body.background,
        "is_current": not has_current,  # first subject becomes current
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.subjects.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/{subject_id}")
async def update_subject(
    subject_id: str,
    body: SubjectUpdate,
    user: dict = Depends(get_current_user),
):
    tid = _require_teacher_scope(user)
    s = await db.subjects.find_one({"id": subject_id, "teacher_id": tid})
    if not s:
        raise HTTPException(status_code=404, detail="مادة غير موجودة")

    update: dict = {}
    if body.name is not None:
        update["name"] = body.name.strip()
    if body.color is not None:
        update["color"] = body.color
    if "background" in body.model_fields_set:
        update["background"] = body.background
    if body.is_current is True:
        # toggle: this one becomes current, all others off
        await db.subjects.update_many(
            {"teacher_id": tid}, {"$set": {"is_current": False}}
        )
        update["is_current"] = True

    if update:
        await db.subjects.update_one(
            {"id": subject_id, "teacher_id": tid}, {"$set": update}
        )
    return await db.subjects.find_one(
        {"id": subject_id, "teacher_id": tid}, {"_id": 0}
    )


@router.delete("/{subject_id}")
async def delete_subject(
    subject_id: str, user: dict = Depends(get_current_user)
):
    tid = _require_teacher_scope(user)
    s = await db.subjects.find_one({"id": subject_id, "teacher_id": tid})
    if not s:
        raise HTTPException(status_code=404, detail="مادة غير موجودة")
    await db.subjects.delete_one({"id": subject_id, "teacher_id": tid})

    # If deleted was current, promote first remaining
    if s.get("is_current"):
        first = await db.subjects.find_one(
            {"teacher_id": tid}, sort=[("created_at", 1)]
        )
        if first:
            await db.subjects.update_one(
                {"id": first["id"]}, {"$set": {"is_current": True}}
            )
    return {"ok": True}
