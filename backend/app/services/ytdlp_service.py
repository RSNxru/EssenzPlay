"""Capa de servicio sobre yt-dlp.

Responsabilidades:
  - Extraer metadata + URL de stream directo SIN descargar (para el player).
  - Construir la lista de formatos para el dropdown.
  - Descargar en segundo plano con progreso (usado por el router de downloads).
  - Traducir errores crudos de yt-dlp a códigos de dominio limpios.
"""
from __future__ import annotations

import asyncio
import os
import re
import subprocess
from dataclasses import dataclass
from functools import partial

import yt_dlp

from app.config import settings

# URL del proveedor de PO tokens (sidecar bgutil). Si no está, yt-dlp sigue
# funcionando para fuentes que no lo requieren (Vimeo, MP4 directos, etc.).
POT_PROVIDER_URL = os.getenv("POT_PROVIDER_URL")
from app.schemas import MediaFormat, MediaInfo


class MediaError(Exception):
    """Error de dominio con código mapeado para el frontend."""

    def __init__(self, code: str, message: str, detail: str | None = None):
        self.code = code
        self.message = message
        self.detail = detail
        super().__init__(message)


# --- Traducción de errores crudos de yt-dlp a mensajes amigables -------------

def _classify_error(raw: str) -> MediaError:
    low = raw.lower()
    if "geo" in low or "not available in your country" in low or "blocked it in your country" in low:
        return MediaError(
            "GEO_BLOCKED",
            "Este contenido está bloqueado en tu región.",
            "Puedes intentar con un proxy o configurar cookies de una sesión válida.",
        )
    # Verificación anti-bot (no es edad): suele aparecer tras muchas peticiones
    # seguidas desde la misma IP, o en contenido que YouTube ha cerrado a invitados.
    if "not a bot" in low or "confirm you" in low and "bot" in low:
        return MediaError(
            "BOT_CHECK",
            "YouTube activó su verificación anti-bot para esta red.",
            "Suele pasar tras muchas peticiones seguidas. Espera unos minutos, o "
            "configura cookies (COOKIES_FILE) para usar una sesión autenticada.",
        )
    if ("age" in low and ("confirm" in low or "restricted" in low)) or "inappropriate for some users" in low:
        return MediaError(
            "AGE_RESTRICTED",
            "Contenido con restricción de edad estricta.",
            "YouTube exige una sesión iniciada: configura COOKIES_FILE en el backend.",
        )
    if "private" in low:
        return MediaError("PRIVATE", "Este video es privado y no se puede reproducir.")
    if "sign in" in low or "login" in low or "this video is only available to" in low:
        return MediaError(
            "AGE_RESTRICTED",
            "Este contenido requiere autenticación.",
            "Configura COOKIES_FILE en el backend.",
        )
    if "removed" in low or "no longer available" in low or "unavailable" in low or "deleted" in low:
        return MediaError("UNAVAILABLE", "El contenido ya no está disponible.")
    if "unsupported url" in low or "is not a valid url" in low:
        return MediaError("GENERIC", "URL no soportada o inválida.")
    return MediaError("GENERIC", "No se pudo procesar el contenido.", raw[:300])


# --- Opciones base de yt-dlp -------------------------------------------------

def _base_opts() -> dict:
    opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
        # 'default' conserva los clientes normales (formatos completos) y sumamos
        # 'web_embedded', que salta la verificación de edad sin necesidad de login.
        "extractor_args": {
            "youtube": {"player_client": ["default", "web_embedded"]}
        },
    }
    # Conecta el proveedor de PO tokens (bgutil) si está disponible
    if POT_PROVIDER_URL:
        opts["extractor_args"]["youtubepot-bgutilhttp"] = {"base_url": [POT_PROVIDER_URL]}
    # Cookies de tu sesión real (opcional): habilita contenido +18 / con login.
    # Se ignora con gracia si el archivo no existe todavía.
    if settings.cookies_file and os.path.exists(settings.cookies_file):
        opts["cookiefile"] = settings.cookies_file
    return opts


def _human_size(n: int | None) -> str:
    if not n:
        return ""
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f}{unit}"
        n /= 1024
    return f"{n:.0f}TB"


def _build_formats(info: dict) -> list[MediaFormat]:
    """Filtra y embellece los formatos para el dropdown del frontend."""
    out: list[MediaFormat] = []
    seen: set[str] = set()
    for f in info.get("formats", []):
        fid = f.get("format_id")
        if not fid or fid in seen:
            continue
        vcodec = f.get("vcodec")
        acodec = f.get("acodec")
        is_audio = vcodec in (None, "none") and acodec not in (None, "none")
        # Solo nos quedan formatos audibles/visibles útiles
        if vcodec in (None, "none") and acodec in (None, "none"):
            continue
        height = f.get("height")
        res = f"{height}p" if height else ("audio" if is_audio else f.get("format_note") or "")
        size = f.get("filesize") or f.get("filesize_approx")
        parts = [res or fid, f.get("ext", "")]
        if is_audio and f.get("abr"):
            parts.append(f"{int(f['abr'])}kbps")
        if size:
            parts.append(_human_size(size))
        label = " • ".join(p for p in parts if p)
        seen.add(fid)
        out.append(
            MediaFormat(
                format_id=fid,
                label=label,
                ext=f.get("ext", ""),
                quality=res,
                resolution=res if not is_audio else None,
                filesize=size,
                is_audio_only=is_audio,
                vcodec=None if vcodec == "none" else vcodec,
                acodec=None if acodec == "none" else acodec,
            )
        )
    # Ordena: video por altura desc, audio al final
    out.sort(key=lambda m: (m.is_audio_only, -(int(re.sub(r"\D", "", m.quality or "0") or 0))))
    return out


def _pick_stream_url(info: dict) -> str | None:
    """URL directa para el <video>. Prefiere un progresivo (audio+video juntos)."""
    # Caso live o url ya resuelta
    if info.get("url"):
        return info["url"]
    best_progressive = None
    for f in info.get("formats", []):
        if f.get("acodec") not in (None, "none") and f.get("vcodec") not in (None, "none"):
            if f.get("url"):
                # nos quedamos con el de mayor altura
                if not best_progressive or (f.get("height") or 0) > (best_progressive.get("height") or 0):
                    best_progressive = f
    if best_progressive:
        return best_progressive.get("url")
    # Fallback: primer formato con url
    for f in info.get("formats", []):
        if f.get("url"):
            return f["url"]
    return None


def _pick_audio_url(info: dict) -> str | None:
    """Mejor pista solo-audio para el modo podcast (<audio>).

    Prefiere m4a/mp4 (compatible con todos los navegadores incl. Safari) y, dentro
    de eso, el mayor bitrate.
    """
    audios = [
        f for f in info.get("formats", [])
        if f.get("acodec") not in (None, "none")
        and f.get("vcodec") in (None, "none")
        and f.get("url")
    ]
    if not audios:
        return None
    audios.sort(
        key=lambda f: (f.get("ext") in ("m4a", "mp4"), f.get("abr") or 0),
        reverse=True,
    )
    return audios[0].get("url")


# --- Streaming HD (merge en vivo con ffmpeg) ---------------------------------

QUALITY_HEIGHT = {"360p": 360, "480p": 480, "720p": 720, "1080p": 1080, "4k": 2160}


def get_stream_urls(url: str, quality: str) -> tuple[str | None, str | None]:
    """Devuelve (video_url, audio_url) para la calidad pedida.

    Elige video-only <= altura (prefiriendo avc/H.264 por compatibilidad) y la
    mejor pista de audio (m4a/AAC). Si no hay separados, cae a un progresivo
    (video_url con audio incluido, audio_url=None).
    """
    h = QUALITY_HEIGHT.get(quality, 720)
    info = _extract_sync(url)
    fmts = info.get("formats", [])

    vids = [
        f for f in fmts
        if f.get("vcodec", "none") != "none" and f.get("acodec", "none") == "none"
        and f.get("url") and (f.get("height") or 0) <= h
    ]
    # altura asc, luego preferir avc (H.264), luego bitrate -> nos quedamos el último
    vids.sort(key=lambda f: (
        f.get("height") or 0,
        (f.get("vcodec") or "").startswith("avc"),
        f.get("tbr") or 0,
    ))
    auds = [
        f for f in fmts
        if f.get("acodec", "none") != "none" and f.get("vcodec", "none") == "none"
        and f.get("url")
    ]
    auds.sort(key=lambda f: (f.get("ext") in ("m4a", "mp4"), f.get("abr") or 0))

    if vids and auds:
        return vids[-1]["url"], auds[-1]["url"]
    # Sin streams separados: progresivo (ya trae audio)
    return _pick_stream_url(info), None


def build_ffmpeg_stream_cmd(video_url: str, audio_url: str | None) -> list[str]:
    """Comando ffmpeg que muxea a mp4 fragmentado en stdout (reproducible en streaming)."""
    cmd = ["ffmpeg", "-loglevel", "error", "-i", video_url]
    if audio_url:
        cmd += ["-i", audio_url]
    cmd += [
        "-c", "copy",                       # sin recodificar: rápido
        "-movflags", "frag_keyframe+empty_moov+default_base_moof",
        "-f", "mp4", "pipe:1",
    ]
    return cmd


# --- Extracción (sin descargar) ----------------------------------------------

def _extract_sync(query: str) -> dict:
    # Si no parece URL, lo tratamos como búsqueda en YouTube
    target = query if re.match(r"^https?://", query.strip()) else f"ytsearch1:{query}"
    try:
        with yt_dlp.YoutubeDL(_base_opts()) as ydl:
            info = ydl.extract_info(target, download=False)
        # ytsearch devuelve una playlist con 'entries'
        if info.get("entries"):
            entries = [e for e in info["entries"] if e]
            if not entries:
                raise MediaError("UNAVAILABLE", "No se encontraron resultados.")
            info = entries[0]
        return info
    except yt_dlp.utils.DownloadError as e:
        raise _classify_error(str(e)) from e
    except yt_dlp.utils.ExtractorError as e:
        raise _classify_error(str(e)) from e


async def extract_media(query: str) -> MediaInfo:
    loop = asyncio.get_running_loop()
    info = await loop.run_in_executor(None, partial(_extract_sync, query))
    return MediaInfo(
        id=info.get("id", ""),
        title=info.get("title", "Sin título"),
        uploader=info.get("uploader") or info.get("channel"),
        duration=info.get("duration"),
        thumbnail=info.get("thumbnail"),
        webpage_url=info.get("webpage_url") or info.get("original_url", query),
        stream_url=_pick_stream_url(info),
        audio_url=_pick_audio_url(info),
        is_live=bool(info.get("is_live")),
        formats=_build_formats(info),
    )


# --- Descarga en segundo plano -----------------------------------------------

# Presets -> format selector de yt-dlp
_FORMAT_PRESETS = {
    "best": "bestvideo+bestaudio/best",
    "4k": "bestvideo[height<=2160]+bestaudio/best[height<=2160]",
    "1080p": "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
    "720p": "bestvideo[height<=720]+bestaudio/best[height<=720]",
    "audio": "bestaudio/best",
}


@dataclass
class DownloadProgress:
    status: str
    progress: float = 0.0
    speed: str | None = None
    eta: str | None = None
    filename: str | None = None
    error: str | None = None


def download_blocking(url: str, fmt: str, on_progress) -> None:
    """Descarga sincrónica con callbacks de progreso. Corre en un thread."""
    is_audio = fmt == "audio"
    selector = _FORMAT_PRESETS.get(fmt, fmt)  # permite format_id crudo también

    def hook(d):
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            done = d.get("downloaded_bytes", 0)
            pct = (done / total * 100) if total else 0
            on_progress(DownloadProgress(
                status="downloading",
                progress=round(pct, 1),
                speed=d.get("_speed_str", "").strip() or None,
                eta=d.get("_eta_str", "").strip() or None,
                filename=d.get("filename"),
            ))
        elif d["status"] == "finished":
            on_progress(DownloadProgress(status="processing", progress=99.0,
                                         filename=d.get("filename")))

    opts = {
        **_base_opts(),
        "skip_download": False,
        "format": selector,
        "outtmpl": f"{settings.download_dir}/%(title)s.%(ext)s",
        "progress_hooks": [hook],
        "merge_output_format": "mp4" if not is_audio else None,
    }
    if is_audio:
        opts["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }]

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            final = ydl.prepare_filename(info)
            if is_audio:
                final = re.sub(r"\.\w+$", ".mp3", final)
        on_progress(DownloadProgress(status="done", progress=100.0, filename=final))
    except (yt_dlp.utils.DownloadError, yt_dlp.utils.ExtractorError) as e:
        err = _classify_error(str(e))
        on_progress(DownloadProgress(status="error", error=err.message))
