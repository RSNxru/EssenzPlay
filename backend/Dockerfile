FROM python:3.12-slim

# ffmpeg: mergear video+audio y extraer MP3.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Deno: runtime de JavaScript que yt-dlp necesita para resolver el reto
# nsig/signature de YouTube (sin esto solo se obtienen storyboards).
COPY --from=denoland/deno:bin-2.1.4 /deno /usr/local/bin/deno

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
