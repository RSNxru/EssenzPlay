from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # CORS: orígenes permitidos del frontend
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Base de datos. Por defecto SQLite (cero config); en Docker se inyecta Postgres.
    # Ej Postgres: postgresql+asyncpg://streamdlp:streamdlp@db:5432/streamdlp
    database_url: str = "sqlite+aiosqlite:///./streamdlp.db"

    # Carpeta donde se guardan las descargas
    download_dir: str = "./downloads"

    # SponsorBlock: categorías a saltar por defecto
    sponsorblock_categories: list[str] = [
        "sponsor",
        "selfpromo",
        "interaction",
        "intro",
        "outro",
    ]

    # Opcional: archivo de cookies para contenido con login/edad (Netscape format)
    cookies_file: str | None = None


settings = Settings()
