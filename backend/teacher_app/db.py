"""MongoDB connection — standalone teacher_app database."""
import os
from motor.motor_asyncio import AsyncIOMotorClient

from .auth import hash_password, verify_password

_mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
_db_name = os.environ.get("DB_NAME", "teacher_app")

client = AsyncIOMotorClient(_mongo_url)
db = client[_db_name]


async def ensure_indexes() -> None:
    await db.teachers.create_index("id", unique=True)
    await db.teachers.create_index("username_lower", unique=True)
    await db.subjects.create_index([("teacher_id", 1), ("id", 1)])
    await db.students.create_index([("teacher_id", 1), ("id", 1)])
    await db.app_settings.create_index("key", unique=True)
    await db.admins.create_index("username", unique=True)


async def seed_admin() -> None:
    """Idempotently make sure the hidden admin account exists with the
    password configured in env. Re-hashes if the env password rotates."""
    username = os.environ.get("ADMIN_USERNAME", "bsn.1988")
    password = os.environ.get("ADMIN_PASSWORD", "12abAB!?")
    existing = await db.admins.find_one({"username": username})
    new_hash = hash_password(password)
    if existing is None:
        await db.admins.insert_one(
            {
                "id": "admin",
                "username": username,
                "password_hash": new_hash,
                "role": "admin",
            }
        )
        return
    if not verify_password(password, existing.get("password_hash", "")):
        await db.admins.update_one(
            {"_id": existing["_id"]}, {"$set": {"password_hash": new_hash}}
        )
