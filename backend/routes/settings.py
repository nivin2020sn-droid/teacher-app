"""Global app settings — admin writes, everyone reads."""
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user, require_admin
from db import db


router = APIRouter(prefix="/api/settings", tags=["settings"])

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
async def get_settings(user: dict = Depends(get_current_user)):
    doc = await db.app_settings.find_one({"key": "global"}, {"_id": 0, "key": 0})
    return {**DEFAULT, **(doc or {})}


@router.put("")
async def update_settings(
    body: SettingsUpdate, _admin: dict = Depends(require_admin)
):
    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    await db.app_settings.update_one(
        {"key": "global"}, {"$set": patch}, upsert=True
    )
    doc = await db.app_settings.find_one({"key": "global"}, {"_id": 0, "key": 0})
    return {**DEFAULT, **(doc or {})}
