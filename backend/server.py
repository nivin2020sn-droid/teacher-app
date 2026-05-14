"""Mosaytra backend — FastAPI app entry point.

Loads .env BEFORE importing anything that touches MONGO_URL / JWT_SECRET, so
modules can read os.environ at import time.
"""
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging  # noqa: E402
import os  # noqa: E402

from fastapi import APIRouter, FastAPI  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

from db import client, ensure_indexes, seed_admin  # noqa: E402
from routes.auth_routes import router as auth_router  # noqa: E402
from routes.teachers import router as teachers_router  # noqa: E402
from routes.subjects import router as subjects_router  # noqa: E402
from routes.students import router as students_router  # noqa: E402
from routes.settings import router as settings_router  # noqa: E402


app = FastAPI(title="Mosaytra API", version="1.0.0")

# Health / hello (kept for backward compat with template)
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Mosaytra API up"}


@api_router.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(api_router)
app.include_router(auth_router)
app.include_router(teachers_router)
app.include_router(subjects_router)
app.include_router(students_router)
app.include_router(settings_router)


# CORS — for Bearer-token auth we don't need credentials, so wildcard is OK.
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
    await ensure_indexes()
    await seed_admin()
    logger.info("Mosaytra API ready.")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
