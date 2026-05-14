"""Flat guardians/parents view across all of the current teacher's students.

Guardians live embedded in student documents. This endpoint flattens them
for convenience (e.g. for a dedicated /guardians screen later).
"""
from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..db import db


router = APIRouter(prefix="/guardians", tags=["teacher_app:guardians"])


def _require_teacher(user: dict) -> str:
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")
    return user["id"]


@router.get("")
async def list_guardians(user: dict = Depends(get_current_user)):
    """Returns a flat list of guardians, each annotated with student info."""
    tid = _require_teacher(user)
    students = await db.students.find(
        {"teacher_id": tid}, {"_id": 0, "id": 1, "name": 1, "parents": 1}
    ).to_list(2000)

    out = []
    for s in students:
        for g in s.get("parents", []) or []:
            out.append(
                {
                    **g,
                    "student_id": s["id"],
                    "student_name": s["name"],
                }
            )
    return out
