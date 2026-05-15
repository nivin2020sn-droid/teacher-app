"""Backup & restore — admin only.

Backups are stored as embedded JSON documents inside the `backups` collection
in the same MongoDB cluster the app uses (so they persist on Render Free,
where local disk is ephemeral). A simple async loop on app startup creates a
daily snapshot at the configured hour (default 02:00 UTC). Up to 365 auto
snapshots are retained; older ones are pruned.

Restoring atomically replaces the contents of every backed-up collection with
the snapshot, after first stamping a `before_restore_*` safety snapshot.
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ..auth import require_admin
from ..db import db

router = APIRouter(prefix="/admin/backups", tags=["teacher_app:backups"])
log = logging.getLogger("teacher_app.backup")

# Collections included in every snapshot.
COLLECTIONS = [
    "teachers",
    "students",
    "subjects",
    "guardians",
    "attendance",
    "grades",
    "assignments",
    "behavior",
    "activities",
    "reports",
    "app_settings",
]

MAX_AUTO_BACKUPS = 365  # ~1 year of daily snapshots.
DEFAULT_BACKUP_HOUR = "02:00"


def _gen_id(prefix: str = "bk") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(d: datetime | None = None) -> str:
    return (d or _now()).isoformat()


async def _settings_doc() -> dict:
    doc = await db.app_settings.find_one(
        {"key": "backup"}, {"_id": 0, "key": 0}
    ) or {}
    return {"backup_hour": doc.get("backup_hour", DEFAULT_BACKUP_HOUR)}


async def _set_settings(patch: dict) -> dict:
    await db.app_settings.update_one(
        {"key": "backup"}, {"$set": patch}, upsert=True
    )
    return await _settings_doc()


async def _audit(op: str, *, user: dict | None, backup_id: str | None,
                 backup_name: str | None, status: str, error: str = "") -> None:
    """Append an audit-log entry. Best-effort — never raises."""
    try:
        await db.backup_log.insert_one({
            "id": _gen_id("lg"),
            "op": op,
            "backup_id": backup_id,
            "backup_name": backup_name,
            "created_at": _iso(),
            "user_id": (user or {}).get("id"),
            "user_name": (user or {}).get("name") or (user or {}).get("username"),
            "status": status,
            "error": error,
        })
    except Exception:  # pragma: no cover
        log.exception("audit insert failed")


async def _dump_data() -> tuple[dict, dict, int]:
    """Return ({collection: [docs...]}, counts, size_bytes)."""
    data: dict[str, list] = {}
    counts: dict[str, int] = {}
    for col in COLLECTIONS:
        docs = await db[col].find({}, {"_id": 0}).to_list(50000)
        data[col] = docs
        counts[col] = len(docs)
    size_bytes = len(json.dumps(data, default=str).encode("utf-8"))
    return data, counts, size_bytes


async def _create_snapshot(
    *,
    name: str,
    btype: str,
    user: dict | None,
) -> dict:
    """Materialise + insert a single snapshot doc, then prune old autos."""
    data, counts, size_bytes = await _dump_data()
    bid = _gen_id()
    doc = {
        "id": bid,
        "name": name,
        "type": btype,           # "auto" | "manual" | "before_restore" | "import"
        "created_at": _iso(),
        "created_by_id": (user or {}).get("id"),
        "created_by_name": (user or {}).get("name") or (user or {}).get("username"),
        "size_bytes": size_bytes,
        "counts": counts,
        "data": data,
    }
    await db.backups.insert_one(doc)
    # insert_one mutates the input and adds an ObjectId _id; strip before
    # returning so FastAPI can JSON-serialise the payload.
    doc.pop("_id", None)
    await _audit("backup", user=user, backup_id=bid, backup_name=name,
                 status="success")

    # Retention: only AUTO snapshots are pruned automatically.
    if btype == "auto":
        autos = await db.backups.find(
            {"type": "auto"}, {"_id": 0, "id": 1, "created_at": 1}
        ).sort("created_at", -1).to_list(MAX_AUTO_BACKUPS + 50)
        if len(autos) > MAX_AUTO_BACKUPS:
            old_ids = [b["id"] for b in autos[MAX_AUTO_BACKUPS:]]
            await db.backups.delete_many({"id": {"$in": old_ids}})

    # Return metadata only (no data) — caller refetches for full payload.
    return {k: v for k, v in doc.items() if k != "data"}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class CreateBackupReq(BaseModel):
    name: Optional[str] = None


class RestoreReq(BaseModel):
    confirm: bool = Field(False, description="Must be true to proceed.")


class ImportReq(BaseModel):
    name: Optional[str] = None
    data: dict


class BackupSettingsReq(BaseModel):
    backup_hour: str = Field(..., pattern=r"^\d{2}:\d{2}$")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/settings")
async def get_settings(_admin: dict = Depends(require_admin)):
    return await _settings_doc()


@router.patch("/settings")
async def set_settings(
    body: BackupSettingsReq, _admin: dict = Depends(require_admin)
):
    return await _set_settings({"backup_hour": body.backup_hour})


@router.get("")
async def list_backups(_admin: dict = Depends(require_admin)):
    items = await db.backups.find(
        {}, {"_id": 0, "data": 0}
    ).sort("created_at", -1).to_list(1000)
    last = items[0] if items else None
    return {
        "items": items,
        "total": len(items),
        "last_backup_at": last["created_at"] if last else None,
        "auto_count": sum(1 for b in items if b.get("type") == "auto"),
        "max_auto": MAX_AUTO_BACKUPS,
    }


@router.post("")
async def create_backup(
    body: CreateBackupReq = Body(default=CreateBackupReq()),
    admin: dict = Depends(require_admin),
):
    name = body.name or f"manual_{_now().strftime('%Y-%m-%d_%H-%M')}"
    meta = await _create_snapshot(name=name, btype="manual", user=admin)
    return meta


@router.get("/log")
async def get_log(_admin: dict = Depends(require_admin)):
    entries = await db.backup_log.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return {"items": entries}


@router.get("/{backup_id}")
async def download_backup(backup_id: str, _admin: dict = Depends(require_admin)):
    doc = await db.backups.find_one({"id": backup_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="نسخة احتياطية غير موجودة")
    # Force browser to treat the response as a file download.
    filename = f"{doc.get('name', backup_id)}.json"
    return JSONResponse(
        content=doc,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{backup_id}")
async def delete_backup(backup_id: str, admin: dict = Depends(require_admin)):
    doc = await db.backups.find_one({"id": backup_id}, {"_id": 0, "name": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="نسخة احتياطية غير موجودة")
    # Safety: never delete the last remaining backup.
    total = await db.backups.count_documents({})
    if total <= 1:
        raise HTTPException(
            status_code=400,
            detail="لا يمكن حذف آخر نسخة احتياطية متبقّية.",
        )
    await db.backups.delete_one({"id": backup_id})
    await _audit("delete", user=admin, backup_id=backup_id,
                 backup_name=doc.get("name"), status="success")
    return {"ok": True}


def _is_valid_snapshot(doc: dict) -> bool:
    return bool(doc) and isinstance(doc.get("data"), dict) and any(
        isinstance(doc["data"].get(c), list) for c in COLLECTIONS
    )


async def _apply_restore(data: dict) -> None:
    """Replace every backed-up collection's contents atomically per-collection."""
    for col in COLLECTIONS:
        docs = data.get(col)
        if not isinstance(docs, list):
            continue
        await db[col].delete_many({})
        if docs:
            # ensure we don't leak the dump's `_id` (we always strip on dump,
            # but be defensive in case of imported payloads).
            for d in docs:
                d.pop("_id", None)
            await db[col].insert_many(docs)


@router.post("/{backup_id}/restore")
async def restore_backup(
    backup_id: str,
    body: RestoreReq,
    admin: dict = Depends(require_admin),
):
    if not body.confirm:
        raise HTTPException(status_code=400, detail="يلزم تأكيد الاسترجاع.")

    doc = await db.backups.find_one({"id": backup_id}, {"_id": 0})
    if not doc or not _is_valid_snapshot(doc):
        await _audit("restore", user=admin, backup_id=backup_id,
                     backup_name=(doc or {}).get("name"),
                     status="failure", error="invalid_or_missing_snapshot")
        raise HTTPException(
            status_code=400,
            detail="النسخة غير صالحة أو ناقصة، لا يمكن الاسترجاع.",
        )

    # Safety: snapshot current state first.
    safety_name = f"before_restore_{_now().strftime('%Y-%m-%d_%H-%M')}"
    safety_meta = await _create_snapshot(
        name=safety_name, btype="before_restore", user=admin
    )

    try:
        await _apply_restore(doc["data"])
    except Exception as e:  # noqa: BLE001
        await _audit("restore", user=admin, backup_id=backup_id,
                     backup_name=doc.get("name"),
                     status="failure", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

    await _audit("restore", user=admin, backup_id=backup_id,
                 backup_name=doc.get("name"), status="success")
    return {"ok": True, "safety_backup": safety_meta}


@router.post("/import")
async def import_backup(body: ImportReq, admin: dict = Depends(require_admin)):
    if not _is_valid_snapshot(body.data):
        raise HTTPException(
            status_code=400, detail="ملف النسخة الاحتياطية غير صالح."
        )
    name = body.name or f"import_{_now().strftime('%Y-%m-%d_%H-%M')}"
    payload = body.data.get("data", {})
    counts = {c: len(payload.get(c, []) or []) for c in COLLECTIONS}
    size_bytes = len(json.dumps(payload, default=str).encode("utf-8"))
    bid = _gen_id()
    doc = {
        "id": bid,
        "name": name,
        "type": "import",
        "created_at": _iso(),
        "created_by_id": admin.get("id"),
        "created_by_name": admin.get("name") or admin.get("username"),
        "size_bytes": size_bytes,
        "counts": counts,
        "data": payload,
    }
    await db.backups.insert_one(doc)
    doc.pop("_id", None)
    await _audit("import", user=admin, backup_id=bid, backup_name=name,
                 status="success")
    return {k: v for k, v in doc.items() if k != "data"}


# ---------------------------------------------------------------------------
# Daily scheduler (in-process). Runs in the FastAPI event loop.
# ---------------------------------------------------------------------------

async def _scheduler_loop() -> None:  # pragma: no cover - timing-bound
    """Once per minute, create an 'auto' snapshot if (a) the current UTC time
    matches the configured HH:MM, AND (b) we have not already snapshotted today.
    """
    while True:
        try:
            now = _now()
            settings = await _settings_doc()
            hh, mm = settings["backup_hour"].split(":")
            if now.hour == int(hh) and now.minute == int(mm):
                day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                existing = await db.backups.find_one({
                    "type": "auto",
                    "created_at": {"$gte": day_start.isoformat()},
                })
                if not existing:
                    name = f"auto_{now.strftime('%Y-%m-%d')}"
                    try:
                        await _create_snapshot(name=name, btype="auto", user=None)
                        log.info("auto backup created: %s", name)
                    except Exception as e:
                        await _audit("backup", user=None, backup_id=None,
                                     backup_name=name, status="failure",
                                     error=str(e))
                        log.exception("auto backup failed")
        except Exception:
            log.exception("scheduler tick failed")
        await asyncio.sleep(60)


def start_scheduler() -> None:
    """Called from FastAPI startup; launches the loop as a background task."""
    asyncio.create_task(_scheduler_loop())
