"""Standalone runner for the teacher_app FastAPI module (used during local
development inside this preview pod).

For production, the host project (kvd-backend) only needs the `teacher_app/`
folder — see /app/backend/INTEGRATION.md for the 3-line integration recipe.
"""
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging  # noqa: E402
import os  # noqa: E402

from fastapi import FastAPI  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

from teacher_app import create_router as teacher_app_router  # noqa: E402
from teacher_app.app import on_startup as teacher_app_startup  # noqa: E402
from teacher_app.db import client as teacher_app_mongo_client  # noqa: E402


app = FastAPI(title="Mosaytra (teacher_app) standalone", version="1.0.0")

# Mount the entire teacher_app under /api/teacher.
# This is the ONLY line the host backend (kvd-backend) needs to integrate it.
app.include_router(teacher_app_router(), prefix="/api/teacher")


# Top-level health check kept under /api/ for backward compatibility with the
# preview environment's existing route checks.
@app.get("/api/")
async def root():
    return {"message": "Mosaytra teacher_app standalone — mounted at /api/teacher"}


_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await teacher_app_startup()
    logger.info("teacher_app ready at /api/teacher")


@app.on_event("shutdown")
async def on_shutdown():
    teacher_app_mongo_client.close()
