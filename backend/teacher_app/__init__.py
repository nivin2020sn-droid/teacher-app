"""teacher_app — isolated, mountable FastAPI module for the teacher dashboard.

Designed to be dropped into any existing FastAPI backend (e.g. kvd-backend)
without touching that project's code. Mount the exported router at
`/api/teacher` and everything just works.

Example integration (in kvd-backend's main.py):

    from teacher_app import create_router as teacher_app_router
    app.include_router(teacher_app_router(), prefix="/api/teacher")

That single line gives you the full Mosaytra teacher dashboard backend.
"""
from .app import create_router

__all__ = ["create_router"]
