# 🎬 EssenzPlay

Cliente alternativo, reproductor sin anuncios y gestor de descargas construido sobre `yt-dlp` + `ffmpeg`.

> ⚠️ **Uso responsable:** Esta herramienta es para uso personal con contenido que tengas derecho a reproducir/descargar (videos propios, dominio público, Creative Commons, o material bajo licencia que lo permita). Respeta los Términos de Servicio de las plataformas y las leyes de copyright de tu país.

## 🏗️ Arquitectura

```
StreamDLP/
├── docker-compose.yml        # Orquestador: backend + frontend + postgres
├── .env.example              # Variables de entorno
├── backend/                  # FastAPI + yt-dlp + ffmpeg
│   ├── app/
│   │   ├── main.py           # App, CORS, routers
│   │   ├── config.py         # Settings (pydantic-settings)
│   │   ├── schemas.py        # Modelos Pydantic (contratos API)
│   │   ├── db.py             # SQLAlchemy async + historial
│   │   ├── services/
│   │   │   ├── ytdlp_service.py   # Extracción de metadata y stream directo
│   │   │   └── sponsorblock.py    # Cliente API SponsorBlock
│   │   └── routers/
│   │       ├── media.py      # /api/extract, /api/sponsorblock
│   │       └── downloads.py  # /api/downloads (+ SSE de progreso)
│   ├── Dockerfile
│   └── requirements.txt
└── frontend/                 # React + Vite + Tailwind + Framer Motion
    └── src/
        ├── App.jsx
        ├── api.js
        └── components/
            ├── SearchBar.jsx
            ├── VideoPlayer.jsx      # Player HTML5 custom con SponsorBlock
            ├── FormatSelector.jsx
            ├── Sidebar.jsx          # Historial
            ├── Dashboard.jsx        # Descargas en vivo (SSE)
            └── SkeletonLoader.jsx
```

## 🚀 Arranque rápido

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend (docs): http://localhost:8000/docs

## 🔓 YouTube: cómo se resuelve el anti-bot (ya configurado)

YouTube (2026) exige dos cosas para entregar formatos de video:

1. **PO token** → lo genera el sidecar `pot-provider` (imagen `brainicism/bgutil-ytdlp-pot-provider`)
   que yt-dlp consulta automáticamente.
2. **Resolver un reto JavaScript** (`nsig`/signature) → para eso el backend incluye **Deno**
   (runtime JS). Sin él, yt-dlp solo obtiene storyboards y falla con
   *"Requested format is not available"*.

Ambas piezas vienen ya montadas en `docker-compose.yml` y el `Dockerfile`. **No necesitas cookies**
para video público. El `HTTP 429` que pueda aparecer en logs es inofensivo: yt-dlp cae a los
clientes de API que sí funcionan.

**Cookies (opcional)** — solo para contenido con edad/login. Como Chrome/Edge usan App-Bound
Encryption (no se pueden exportar automáticamente), usa una extensión *"Get cookies.txt LOCALLY"*,
guarda `backend/cookies.txt`, pon `COOKIES_FILE=/app/cookies.txt` en `.env` y monta el archivo.

## 🔌 Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/extract` | Extrae metadata + URL de stream directo (sin descargar) |
| `GET`  | `/api/sponsorblock/{video_id}` | Segmentos de SponsorBlock a saltar |
| `POST` | `/api/downloads` | Inicia descarga en segundo plano |
| `GET`  | `/api/downloads` | Lista descargas |
| `GET`  | `/api/downloads/{id}/events` | Stream SSE con progreso en vivo |
| `GET`  | `/api/history` | Historial de reproducciones |
