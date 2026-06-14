from fastapi import APIRouter, HTTPException

from app import db
from app.schemas import ExtractRequest, MediaInfo, SponsorSegment
from app.services import sponsorblock
from app.services.ytdlp_service import MediaError, extract_media

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
