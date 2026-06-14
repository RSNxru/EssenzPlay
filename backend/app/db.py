"""Persistencia del historial con SQLAlchemy async."""
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, select, func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


class History(Base):
    __tablename__ = "history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    video_id: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(512))
    thumbnail: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    webpage_url: Mapped[str] = mapped_column(String(1024))
    played_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def add_history(video_id: str, title: str, thumbnail: str | None, url: str) -> None:
    async with SessionLocal() as s:
        # Evita duplicar el mismo video consecutivamente
        last = await s.scalar(
            select(History).where(History.video_id == video_id).order_by(History.id.desc()).limit(1)
        )
        if last:
            last.played_at = datetime.utcnow()
        else:
            s.add(History(video_id=video_id, title=title, thumbnail=thumbnail, webpage_url=url))
        await s.commit()


async def list_history(limit: int = 50) -> list[History]:
    async with SessionLocal() as s:
        rows = await s.scalars(select(History).order_by(History.played_at.desc()).limit(limit))
        return list(rows)
