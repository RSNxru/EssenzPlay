from datetime import datetime
from pydantic import BaseModel, Field


# ---------- Requests ----------

class ExtractRequest(BaseModel):
    # Acepta URL directa o términos de búsqueda (ej "ytsearch:lofi beats")
    query: str = Field(..., min_length=1, description="URL o términos de búsqueda")


class DownloadRequest(BaseModel):
    url: str
    # format_id concreto, o presets: "best", "1080p", "720p", "audio"
    format: str = "best"
    title: str | None = None


# ---------- Responses ----------

class MediaFormat(BaseModel):
    format_id: str
    label: str            # Texto bonito para el dropdown: "1080p • mp4 • 4.2MB/s"
    ext: str
    quality: str | None = None
    resolution: str | None = None
    filesize: int | None = None
    is_audio_only: bool = False
    vcodec: str | None = None
    acodec: str | None = None


class MediaInfo(BaseModel):
    id: str
    title: str
    uploader: str | None = None
    duration: int | None = None
    thumbnail: str | None = None
    webpage_url: str
    # URL de stream directo lista para el <video> (sin descargar)
    stream_url: str | None = None
    # URL solo-audio para el modo podcast (escucha en segundo plano)
    audio_url: str | None = None
    is_live: bool = False
    formats: list[MediaFormat] = []


class SponsorSegment(BaseModel):
    category: str
    start: float          # segundos
    end: float            # segundos
    uuid: str | None = None


class DownloadStatus(BaseModel):
    id: str
    url: str
    title: str | None = None
    format: str
    status: str           # queued | downloading | processing | done | error
    progress: float = 0.0  # 0-100
    speed: str | None = None
    eta: str | None = None
    filename: str | None = None
    error: str | None = None


class HistoryItem(BaseModel):
    id: int
    video_id: str
    title: str
    thumbnail: str | None = None
    webpage_url: str
    played_at: datetime

    class Config:
        from_attributes = True


# Errores de dominio mapeados para que el frontend los pinte con elegancia
class ApiError(BaseModel):
    code: str             # GEO_BLOCKED | AGE_RESTRICTED | UNAVAILABLE | PRIVATE | GENERIC
    message: str          # Texto amigable en español
    detail: str | None = None
