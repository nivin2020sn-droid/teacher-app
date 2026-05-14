"""Students (teacher-scoped) with embedded parents/guardians (unlimited)."""
import uuid
from typing import Optional, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import get_current_user
from db import db


router = APIRouter(prefix="/api/students", tags=["students"])


def _gen_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


class Parent(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1)
    relation: Optional[str] = ""  # صلة القرابة
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""


class StudentCreate(BaseModel):
    name: str = Field(..., min_length=1)
    birth_date: Optional[str] = ""  # ISO date string
    address: Optional[str] = ""
    notes: Optional[str] = ""
    parents: List[Parent] = []


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    birth_date: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    parents: Optional[List[Parent]] = None


def _require_teacher_scope(user: dict) -> str:
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")
    return user["id"]


def _normalize_parents(parents: List[Parent]) -> List[dict]:
    out = []
    for p in parents:
        pd = p.model_dump()
        if not pd.get("id"):
            pd["id"] = _gen_id("p")
        out.append(pd)
    return out


@router.get("")
async def list_students(user: dict = Depends(get_current_user)):
    tid = _require_teacher_scope(user)
    items = await db.students.find(
        {"teacher_id": tid}, {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    return items


@router.post("", status_code=201)
async def create_student(
    body: StudentCreate, user: dict = Depends(get_current_user)
):
    tid = _require_teacher_scope(user)
    doc = {
        "id": _gen_id("s"),
        "teacher_id": tid,
        "name": body.name.strip(),
        "birth_date": body.birth_date or "",
        "address": body.address or "",
        "notes": body.notes or "",
        "parents": _normalize_parents(body.parents or []),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.students.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/{student_id}")
async def update_student(
    student_id: str,
    body: StudentUpdate,
    user: dict = Depends(get_current_user),
):
    tid = _require_teacher_scope(user)
    s = await db.students.find_one({"id": student_id, "teacher_id": tid})
    if not s:
        raise HTTPException(status_code=404, detail="طالب غير موجود")

    update: dict = {}
    if body.name is not None:
        update["name"] = body.name.strip()
    if body.birth_date is not None:
        update["birth_date"] = body.birth_date
    if body.address is not None:
        update["address"] = body.address
    if body.notes is not None:
        update["notes"] = body.notes
    if body.parents is not None:
        update["parents"] = _normalize_parents(body.parents)

    if update:
        await db.students.update_one(
            {"id": student_id, "teacher_id": tid}, {"$set": update}
        )
    return await db.students.find_one(
        {"id": student_id, "teacher_id": tid}, {"_id": 0}
    )


@router.delete("/{student_id}")
async def delete_student(
    student_id: str, user: dict = Depends(get_current_user)
):
    tid = _require_teacher_scope(user)
    res = await db.students.delete_one({"id": student_id, "teacher_id": tid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="طالب غير موجود")
    return {"ok": True}
