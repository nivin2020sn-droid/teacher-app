"""teacher_app router factory.

Exposes a single function `create_router()` that returns a fully-wired
APIRouter ready to be mounted by the host backend:

    from teacher_app import create_router
    app.include_router(create_router(), prefix="/api/teacher")
"""
from fastapi import APIRouter, Depends

from .routes.auth_routes import router as auth_router
from .routes.teachers import router as teachers_router
from .routes.subjects import router as subjects_router
from .routes.students import router as students_router
from .routes.guardians import router as guardians_router
from .routes.settings import router as settings_router


def create_router() -> APIRouter:
    """Build the composite router for teacher_app.

    Endpoints exposed (when mounted at /api/teacher):
    - POST /api/teacher/login
    - GET  /api/teacher/me
    - POST /api/teacher/preview/{teacher_id}
    - CRUD /api/teacher/teachers
    - CRUD /api/teacher/subjects
    - CRUD /api/teacher/students
    - GET  /api/teacher/guardians
    - GET/PUT /api/teacher/settings
    """
    router = APIRouter()
    router.include_router(auth_router)        # POST /login, GET /me, POST /preview/{id}
    router.include_router(teachers_router)    # /teachers/*
    router.include_router(subjects_router)    # /subjects/*
    router.include_router(students_router)    # /students/*
    router.include_router(guardians_router)   # /guardians
    router.include_router(settings_router)    # /settings

    @router.get("/health", tags=["teacher_app"])
    async def health():
        return {"status": "ok", "module": "teacher_app"}

    return router


async def on_startup():
    """Optional startup hook — host backend should call this once on app start.

    It only creates indexes inside the `teacher_app` database and seeds the
    hidden admin account. It NEVER touches any other database/collections.
    """
    from .db import ensure_indexes, seed_admin

    await ensure_indexes()
    await seed_admin()
