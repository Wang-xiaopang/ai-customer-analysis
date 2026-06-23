# ai-customer-analysis/backend/app/database.py
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=3,
    max_overflow=2,
    pool_recycle=60,
    isolation_level="READ COMMITTED",  # MySQL 关键：避免跨连接不可见
)
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,  # 手动 flush
)
