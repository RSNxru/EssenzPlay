"""Cliente de la API pública de SponsorBlock (sponsor.ajay.app).

Devuelve los segmentos a saltar para un videoID dado. El salto real lo
ejecuta el reproductor en el frontend escuchando el evento `timeupdate`.
"""
import httpx

from app.config import settings
from app.schemas import SponsorSegment

API = "https://sponsor.ajay.app/api/skipSegments"


async def get_segments(video_id: str) -> list[SponsorSegment]:
    params = [("videoID", video_id)]
    for cat in settings.sponsorblock_categories:
        params.append(("category", cat))

    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            resp = await client.get(API, params=params)
        except httpx.RequestError:
            return []  # SponsorBlock caído != error fatal; degradamos con gracia

    if resp.status_code == 404:
        return []  # 404 = no hay segmentos para este video
    if resp.status_code != 200:
        return []

    out: list[SponsorSegment] = []
    for item in resp.json():
        seg = item.get("segment", [0, 0])
        out.append(SponsorSegment(
            category=item.get("category", "sponsor"),
            start=float(seg[0]),
            end=float(seg[1]),
            uuid=item.get("UUID"),
        ))
    return out
