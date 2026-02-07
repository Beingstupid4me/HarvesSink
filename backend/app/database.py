"""
HarvesSink – SQLAlchemy models + async DB helpers.
Keeps it minimal: one table for readings, one for calibration baselines.
"""

from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# ── Engine & session factory ─────────────────────────────────
engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


# ── Tables ───────────────────────────────────────────────────
class ReadingRow(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, index=True)
    timestamp = Column(DateTime, server_default=func.now())
    ph = Column(Float)
    tds = Column(Float)
    turbidity = Column(Float)
    temperature = Column(Float)
    bod = Column(Float, default=0)
    cod = Column(Float, default=0)
    valve_decision = Column(String, default="harvest")
    anomaly = Column(Boolean, default=False)


class BaselineRow(Base):
    __tablename__ = "baselines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, unique=True, index=True)
    ph_mean = Column(Float, default=0)
    ph_std = Column(Float, default=0)
    tds_mean = Column(Float, default=0)
    tds_std = Column(Float, default=0)
    turbidity_mean = Column(Float, default=0)
    turbidity_std = Column(Float, default=0)
    sample_count = Column(Integer, default=0)
    is_complete = Column(Boolean, default=False)


class ImpactRow(Base):
    __tablename__ = "impact"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, unique=True, index=True)
    liters_saved = Column(Float, default=0)
    money_saved = Column(Float, default=0)
    lake_impact_score = Column(Float, default=0)


# ── Helpers ──────────────────────────────────────────────────
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
