"""teacher_app router factory.

Builds the composite APIRouter for the Smart Teacher Dashboard backend.
Mounted at `/api` by server.py.
"""
from fastapi import APIRouter

from .routes.auth_routes import router as auth_router
from .routes.teachers import router as teachers_router
from .routes.subjects import router as subjects_router
from .routes.students import router as students_router
from .routes.guardians import router as guardians_router
from .routes.settings import router as settings_router


def create_router() -> APIRouter:
    """Endpoints exposed (mounted at /api):

    Auth:
      - POST /api/auth/login
      - GET  /api/auth/me
      - POST /api/auth/preview/{teacher_id}

    Resources:
      - CRUD /api/teachers              (admin)
      - CRUD /api/subjects              (teacher-scoped)
      - CRUD /api/students              (teacher-scoped)
      - GET  /api/guardians             (teacher-scoped, flat list)
      - GET/PUT /api/settings           (read=any auth, write=admin)
      - GET  /api/health
    """
    router = APIRouter()
    router.include_router(auth_router)
    router.include_router(teachers_router)
    router.include_router(subjects_router)
    router.include_router(students_router)
    router.include_router(guardians_router)
    router.include_router(settings_router)

    @router.get("/health", tags=["health"])
    async def health():
        return {"status": "ok"}

    return router


async def on_startup():
    """Create indexes and seed the hidden admin account (idempotent)."""
    from .db import ensure_indexes, seed_admin

    await ensure_indexes()
    await seed_admin()
