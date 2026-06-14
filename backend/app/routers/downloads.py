"""Gestor de descargas en segundo plano con progreso vía SSE.

Nota de producción: este manager guarda el estado en memoria (dict) y usa
un ThreadPoolExecutor. Para escalar a múltiples workers/réplicas, migrar a
Celery/RQ + Redis y publicar el progreso en un canal pub/sub.
"""
import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from app.schemas import DownloadRequest, DownloadStatus
from app.services.ytdlp_service import DownloadProgress, download_blocking

router = APIRouter(prefix="/api/downloads", tags=["downloads"])

_executor = ThreadPoolExecutor(max_workers=3)
_jobs: dict[str, DownloadStatus] = {}


def _run_job(job_id: str, loop: asyncio.AbstractEventLoop):
    job = _jobs[job_id]

    def on_progress(p: DownloadProgress):
        # Mutamos el estado compartido; el SSE lo lee en cada tick
        job.status = p.status
        job.progress = p.progress
        job.speed = p.speed
        job.eta = p.eta
        if p.filename:
            job.filename = p.filename
        if p.error:
            job.error = p.error

    download_blocking(job.url, job.format, on_progress)


@router.post("", response_model=DownloadStatus)
async def start_download(req: DownloadRequest):
    job_id = uuid.uuid4().hex[:12]
    job = DownloadStatus(
        id=job_id, url=req.url, title=req.title, format=req.format, status="queued"
    )
    _jobs[job_id] = job
    loop = asyncio.get_running_loop()
    loop.run_in_executor(_executor, _run_job, job_id, loop)
    return job


@router.get("", response_model=list[DownloadStatus])
async def list_downloads():
    return list(_jobs.values())


@router.get("/{job_id}/events")
async def download_events(job_id: str):
    """Stream SSE: emite el estado del job hasta que termina o falla."""

    async def gen():
        last = None
        while True:
            job = _jobs.get(job_id)
            if job is None:
                yield {"event": "error", "data": '{"error":"job no encontrado"}'}
                return
            snapshot = job.model_dump_json()
            if snapshot != last:
                yield {"event": "progress", "data": snapshot}
                last = snapshot
            if job.status in ("done", "error"):
                yield {"event": "end", "data": snapshot}
                return
            await asyncio.sleep(0.5)

    return EventSourceResponse(gen())
