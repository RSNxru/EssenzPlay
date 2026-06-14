import asyncio
import subprocess

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app import db
from app.schemas import ExtractRequest, MediaInfo, SponsorSegment
from app.services import sponsorblock
from app.services.ytdlp_service import (
    MediaError,
    build_ffmpeg_stream_cmd,
    extract_media,
    get_stream_urls,
)

router = APIRouter(prefix="/api", tags=["media"])


@router.post("/extract", response_model=MediaInfo)
async def extract(req: ExtractRequest):
    """Recibe URL o búsqueda, devuelve metadata + stream directo sin descargar."""
    try:
        info = await extract_media(req.query)
    except MediaError as e:
        # 422 con cuerpo estructurado para que el frontend pinte el error bonito
        raise HTTPException(
            status_code=422,
            detail={"code": e.code, "message": e.message, "detail": e.detail},
        )

    # Registra en historial (best-effort, no bloquea la respuesta si falla)
    if info.id:
        try:
            await db.add_history(info.id, info.title, info.thumbnail, info.webpage_url)
        except Exception:
            pass
    return info


@router.get("/sponsorblock/{video_id}", response_model=list[SponsorSegment])
async def sponsor(video_id: str):
    return await sponsorblock.get_segments(video_id)


@router.get("/stream")
async def stream(
    url: str = Query(..., description="URL del video"),
    quality: str = Query("720p", description="360p | 480p | 720p | 1080p | 4k"),
):
    """Sirve el video en HD mezclando video+audio al vuelo con ffmpeg.

    Resuelve el límite de 360p del reproductor: YouTube solo da 360p en formato
    progresivo; las altas resoluciones son streams separados que mezclamos aquí.
    """
    loop = asyncio.get_running_loop()
    try:
        video_url, audio_url = await loop.run_in_executor(
            None, get_stream_urls, url, quality
        )
    except MediaError as e:
        raise HTTPException(422, detail={"code": e.code, "message": e.message})
    if not video_url:
        raise HTTPException(404, detail={"code": "GENERIC", "message": "Sin formato reproducible."})

    cmd = build_ffmpeg_stream_cmd(video_url, audio_url)
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=0)

    async def gen():
        try:
            while True:
                chunk = await loop.run_in_executor(None, proc.stdout.read, 65536)
                if not chunk:
                    break
                yield chunk
        finally:
            proc.kill()

    return StreamingResponse(gen(), media_type="video/mp4")
