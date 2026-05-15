"""Reports & student profile aggregation.

Builds analytical views on top of the data the app already collects:
  - Student attendance summary (counts + per-day records, filterable by date).
  - Class attendance summary (one row per student).
  - Smart-status flag derived from attendance frequency.

No demo data: every figure is computed from real Mongo collections. Routes
that depend on collections we have not yet built (grades, assignments,
behaviour, activities) intentionally return empty arrays so the front-end
can show a 'no data yet' state instead of fabricating numbers.
"""
from datetime import date as date_cls, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import get_current_user
from ..db import db


router = APIRouter(prefix="/reports", tags=["teacher_app:reports"])


def _require_teacher(user: dict) -> str:
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")
    return user["id"]


def _date_range(from_: Optional[str], to: Optional[str]) -> tuple[str, str]:
    today = date_cls.today()
    end = to or today.isoformat()
    start = from_ or (today - timedelta(days=30)).isoformat()
    return start, end


def _smart_status(counts: dict) -> dict:
    """Heuristic: turn attendance counts into a one-line status label."""
    absent = counts.get("absent", 0)
    late = counts.get("late", 0)
    early = counts.get("early_leave", 0)
    if absent >= 5:
        return {"key": "urgent", "label": "يحتاج متابعة عاجلة", "color": "#dc2626"}
    if late >= 5 or (absent >= 2 and late >= 2):
        return {"key": "watch", "label": "يحتاج متابعة", "color": "#ea580c"}
    if early >= 3:
        return {"key": "watch", "label": "يحتاج متابعة", "color": "#ea580c"}
    return {"key": "stable", "label": "مستقر", "color": "#16a34a"}


async def _attendance_summary(tid: str, student_id: str, frm: str, to: str):
    cur = db.attendance.find(
        {
            "teacher_id": tid,
            "student_id": student_id,
            "date": {"$gte": frm, "$lte": to},
        },
        {"_id": 0},
    ).sort("date", -1)
    records = await cur.to_list(2000)
    counts = {"present": 0, "absent": 0, "late": 0, "early_leave": 0}
    excused = 0
    for r in records:
        st = r.get("status", "present")
        if st in counts:
            counts[st] += 1
        if r.get("excused"):
            excused += 1
    total = sum(counts.values())
    attendance_rate = (
        round((counts["present"] + counts["late"]) / total * 100) if total else 0
    )
    return {
        "from": frm,
        "to": to,
        "counts": counts,
        "excused_count": excused,
        "total_days": total,
        "attendance_rate": attendance_rate,
        "smart_status": _smart_status(counts),
        "records": records,
    }


# ============ student profile aggregate ============

@router.get("/student/{student_id}/profile")
async def student_profile(
    student_id: str,
    user: dict = Depends(get_current_user),
):
    """Aggregated read-only view used by StudentProfilePage."""
    tid = _require_teacher(user)
    student = await db.students.find_one(
        {"id": student_id, "teacher_id": tid}, {"_id": 0}
    )
    if not student:
        raise HTTPException(status_code=404, detail="طالب غير موجود")

    today = date_cls.today()
    last_30 = await _attendance_summary(
        tid, student_id, (today - timedelta(days=30)).isoformat(), today.isoformat()
    )

    # Modules not yet implemented surface as empty arrays — the UI knows how
    # to render a graceful "coming soon" empty-state instead of inventing data.
    return {
        "student": student,
        "attendance_30d": last_30,
        "grades": [],
        "assignments": [],
        "behavior": [],
        "activities": [],
    }


# ============ student attendance report (date-ranged) ============

@router.get("/student/{student_id}/attendance")
async def student_attendance_report(
    student_id: str,
    from_: Optional[str] = Query(None, alias="from", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    to: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    user: dict = Depends(get_current_user),
):
    tid = _require_teacher(user)
    student = await db.students.find_one(
        {"id": student_id, "teacher_id": tid}, {"_id": 0}
    )
    if not student:
        raise HTTPException(status_code=404, detail="طالب غير موجود")
    frm, end = _date_range(from_, to)
    summary = await _attendance_summary(tid, student_id, frm, end)
    return {"student": student, **summary}


# ============ class-wide attendance report ============

@router.get("/class/attendance")
async def class_attendance_report(
    from_: Optional[str] = Query(None, alias="from", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    to: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    user: dict = Depends(get_current_user),
):
    """One row per student in the teacher's class."""
    tid = _require_teacher(user)
    frm, end = _date_range(from_, to)

    students = await db.students.find(
        {"teacher_id": tid}, {"_id": 0, "id": 1, "name": 1}
    ).to_list(2000)

    rows = []
    for s in students:
        sub = await _attendance_summary(tid, s["id"], frm, end)
        rows.append(
            {
                "student_id": s["id"],
                "student_name": s["name"],
                "counts": sub["counts"],
                "excused_count": sub["excused_count"],
                "total_days": sub["total_days"],
                "attendance_rate": sub["attendance_rate"],
                "smart_status": sub["smart_status"],
            }
        )

    # Class-level totals
    totals = {"present": 0, "absent": 0, "late": 0, "early_leave": 0}
    for r in rows:
        for k in totals:
            totals[k] += r["counts"].get(k, 0)
    needs_followup = [r for r in rows if r["smart_status"]["key"] != "stable"]

    return {
        "from": frm,
        "to": end,
        "total_students": len(students),
        "totals": totals,
        "rows": rows,
        "needs_followup_count": len(needs_followup),
    }
