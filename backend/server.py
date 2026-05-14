"""Smart Teacher Dashboard — standalone FastAPI backend entry point."""
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging  # noqa: E402
import os  # noqa: E402

from fastapi import FastAPI  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

from teacher_app import create_router  # noqa: E402
from teacher_app.app import on_startup as app_startup  # noqa: E402
from teacher_app.db import client as mongo_client  # noqa: E402


app = FastAPI(title="Smart Teacher Dashboard API", version="1.0.0")

# Mount the entire API under /api (standalone — no other backend involved).
app.include_router(create_router(), prefix="/api")


@app.get("/api/")
async def root():
    return {"message": "Smart Teacher Dashboard API"}


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
    await app_startup()
    logger.info("Smart Teacher Dashboard API ready.")


@app.on_event("shutdown")
async def on_shutdown():
    mongo_client.close()
