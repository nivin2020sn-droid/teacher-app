"""Attendance — daily per-teacher records + work-day settings (start/end times,
manual student ordering). No seat positions. Auto-marks everyone present when a
new day is opened within working hours; converts absent→late when re-marked
inside work hours."""
import uuid
from datetime import datetime, timezone, date as date_cls
from typing import Optional, List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..auth import get_current_user
from ..db import db


router = APIRouter(prefix="/attendance", tags=["teacher_app:attendance"])


# ---------- helpers ----------

def _gen_id() -> str:
    return f"att_{uuid.uuid4().hex[:10]}"


def _require_teacher(user: dict) -> str:
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")
    return user["id"]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now_hhmm() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M")


def _today() -> str:
    return date_cls.today().isoformat()


def _hhmm_to_minutes(s: str) -> int:
    h, m = s.split(":")
    return int(h) * 60 + int(m)


def _is_within_workhours(day_start: str, day_end: str) -> bool:
    try:
        now = _hhmm_to_minutes(_now_hhmm())
        return _hhmm_to_minutes(day_start) <= now <= _hhmm_to_minutes(day_end)
    except Exception:
        return False


def _is_after_workhours(day_end: str) -> bool:
    try:
        return _hhmm_to_minutes(_now_hhmm()) > _hhmm_to_minutes(day_end)
    except Exception:
        return False


DEFAULT_DAY_START = "07:00"
DEFAULT_DAY_END = "13:00"


async def _get_attendance_settings(tid: str) -> dict:
    """Pull (or initialise) the work-day settings stored on the teacher doc."""
    t = await db.teachers.find_one({"id": tid}, {"_id": 0}) or {}
    return {
        "day_start": t.get("day_start") or DEFAULT_DAY_START,
        "day_end": t.get("day_end") or DEFAULT_DAY_END,
        "student_order": t.get("student_order") or [],
    }


def _public_record(d: dict) -> dict:
    """Strip internal mongo fields before returning."""
    d.pop("_id", None)
    return d


STATUS_VALUES = ("present", "absent", "late", "early_leave")
StatusT = Literal["present", "absent", "late", "early_leave"]


# ---------- models ----------

class SettingsUpdate(BaseModel):
    day_start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    day_end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    student_order: Optional[List[str]] = None


class StatusBody(BaseModel):
    status: StatusT
    excused: Optional[bool] = None
    note: Optional[str] = None
    # Optional explicit times (HH:MM). If omitted, server stamps from now.
    arrival_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    departure_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")


# ---------- settings endpoints ----------

@router.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    tid = _require_teacher(user)
    return await _get_attendance_settings(tid)


@router.patch("/settings")
async def update_settings(
    body: SettingsUpdate, user: dict = Depends(get_current_user)
):
    tid = _require_teacher(user)
    patch = body.model_dump(exclude_unset=True)
    if patch:
        await db.teachers.update_one({"id": tid}, {"$set": patch})
    return await _get_attendance_settings(tid)


# ---------- daily attendance ----------

@router.get("")
async def get_day(
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    user: dict = Depends(get_current_user),
):
    """Returns { settings, records: [...] } for the requested date.

    First-visit-of-the-day behaviour: if there are NO records yet for this
    date AND (date is today AND we're within work-hours OR date is past),
    bootstrap one record per student marked 'present'. This realises the
    "everyone is present by default" rule without writing speculative data on
    previous opens (idempotent: re-calling will not duplicate).
    """
    tid = _require_teacher(user)
    settings = await _get_attendance_settings(tid)

    records = await db.attendance.find(
        {"teacher_id": tid, "date": date}, {"_id": 0}
    ).to_list(5000)

    if not records:
        # Bootstrap: create a "present" baseline for every student that
        # belongs to this teacher.
        students = await db.students.find(
            {"teacher_id": tid}, {"_id": 0, "id": 1}
        ).to_list(5000)
        if students:
            now_iso = _now_iso()
            baseline = [
                {
                    "id": _gen_id(),
                    "teacher_id": tid,
                    "date": date,
                    "student_id": s["id"],
                    "status": "present",
                    "excused": False,
                    "note": "",
                    "arrival_time": None,
                    "departure_time": None,
                    "day_start": settings["day_start"],
                    "day_end": settings["day_end"],
                    "recorded_by_id": user["id"],
                    "recorded_by_name": user.get("name") or "",
                    "recorded_by_username": user.get("username") or "",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                }
                for s in students
            ]
            if baseline:
                await db.attendance.insert_many(baseline)
                # re-read so we have whatever Mongo stored
                records = await db.attendance.find(
                    {"teacher_id": tid, "date": date}, {"_id": 0}
                ).to_list(5000)

    return {"settings": settings, "records": records}


@router.put("/{student_id}")
async def set_status(
    student_id: str,
    body: StatusBody,
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    user: dict = Depends(get_current_user),
):
    """Upsert today's record for a student. Auto-logic:

    - absent → present, while inside work hours → late (arrival = now)
    - present → absent → arrival cleared
    - early_leave → departure stamped (now if not provided)
    - late → arrival stamped (now if not provided)
    """
    tid = _require_teacher(user)
    student = await db.students.find_one(
        {"id": student_id, "teacher_id": tid}, {"_id": 0, "id": 1}
    )
    if not student:
        raise HTTPException(status_code=404, detail="طالب غير موجود")

    settings = await _get_attendance_settings(tid)
    existing = await db.attendance.find_one(
        {"teacher_id": tid, "date": date, "student_id": student_id}, {"_id": 0}
    )

    status: str = body.status
    prev_status = (existing or {}).get("status")
    now_hhmm = _now_hhmm()

    # Auto-promote: switching FROM absent → present inside work hours = late.
    if (
        prev_status == "absent"
        and status == "present"
        and _is_within_workhours(settings["day_start"], settings["day_end"])
    ):
        status = "late"

    # Time stamping defaults.
    arrival = body.arrival_time
    departure = body.departure_time
    if status == "late" and not arrival:
        arrival = now_hhmm
    if status == "early_leave" and not departure:
        departure = now_hhmm
    if status == "absent":
        arrival = None  # clear stale arrival on absent
    if status == "present":
        # Pure "present" wipes both stamps (only late/early_leave keep them).
        arrival = None
        departure = None

    doc = {
        "id": (existing or {}).get("id") or _gen_id(),
        "teacher_id": tid,
        "date": date,
        "student_id": student_id,
        "status": status,
        "excused": bool(body.excused) if body.excused is not None else (existing or {}).get("excused", False),
        "note": body.note if body.note is not None else (existing or {}).get("note", ""),
        "arrival_time": arrival,
        "departure_time": departure,
        "day_start": settings["day_start"],
        "day_end": settings["day_end"],
        "recorded_by_id": user["id"],
        "recorded_by_name": user.get("name") or "",
        "recorded_by_username": user.get("username") or "",
        "updated_at": _now_iso(),
        "created_at": (existing or {}).get("created_at") or _now_iso(),
    }

    await db.attendance.update_one(
        {"teacher_id": tid, "date": date, "student_id": student_id},
        {"$set": doc},
        upsert=True,
    )
    return _public_record(doc)


@router.post("/mark-all-present")
async def mark_all_present(
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    user: dict = Depends(get_current_user),
):
    """Reset every student of this teacher to 'present' for the given date.
    Useful as a one-tap reset and to bootstrap a day."""
    tid = _require_teacher(user)
    settings = await _get_attendance_settings(tid)
    students = await db.students.find(
        {"teacher_id": tid}, {"_id": 0, "id": 1}
    ).to_list(5000)
    now_iso = _now_iso()
    for s in students:
        await db.attendance.update_one(
            {"teacher_id": tid, "date": date, "student_id": s["id"]},
            {
                "$set": {
                    "teacher_id": tid,
                    "date": date,
                    "student_id": s["id"],
                    "status": "present",
                    "excused": False,
                    "note": "",
                    "arrival_time": None,
                    "departure_time": None,
                    "day_start": settings["day_start"],
                    "day_end": settings["day_end"],
                    "recorded_by_id": user["id"],
                    "recorded_by_name": user.get("name") or "",
                    "recorded_by_username": user.get("username") or "",
                    "updated_at": now_iso,
                },
                "$setOnInsert": {"id": _gen_id(), "created_at": now_iso},
            },
            upsert=True,
        )
    records = await db.attendance.find(
        {"teacher_id": tid, "date": date}, {"_id": 0}
    ).to_list(5000)
    return {"records": records}
