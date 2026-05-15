"""Global app settings — public read (so login screen can render branding),
admin-only write."""
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..auth import require_admin
from ..db import db


router = APIRouter(prefix="/settings", tags=["teacher_app:settings"])

DEFAULT = {
    "appName": "مسيطره",
    "appTagline": "لوحة تحكم المعلمة",
    "logo": None,
    "icon": None,
    "primaryColor": "#7c5cff",
    "backgroundStyle": "soft-violet",
}


class SettingsUpdate(BaseModel):
    appName: Optional[str] = None
    appTagline: Optional[str] = None
    logo: Optional[str] = None
    icon: Optional[str] = None
    primaryColor: Optional[str] = None
    backgroundStyle: Optional[str] = None


@router.get("")
async def get_settings():
    """Public — branding must be available before login."""
    doc = await db.app_settings.find_one({"key": "global"}, {"_id": 0, "key": 0})
    return {**DEFAULT, **(doc or {})}


@router.put("")
async def update_settings(
    body: SettingsUpdate, _admin: dict = Depends(require_admin)
):
    patch = body.model_dump(exclude_unset=True)
    await db.app_settings.update_one(
        {"key": "global"}, {"$set": patch}, upsert=True
    )
    doc = await db.app_settings.find_one({"key": "global"}, {"_id": 0, "key": 0})
    return {**DEFAULT, **(doc or {})}
