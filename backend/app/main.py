import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db, list_history
from app.routers import downloads, media
from app.schemas import HistoryItem


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.download_dir, exist_ok=True)
    await init_db()
    yield


app = FastAPI(title="StreamDLP API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(media.router)
app.include_router(downloads.router)


@app.get("/api/history", response_model=list[HistoryItem])
async def history():
    return await list_history()


@app.get("/api/health")
async def health():
    return {"status": "ok"}
