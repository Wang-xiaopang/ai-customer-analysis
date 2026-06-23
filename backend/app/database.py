# ai-customer-analysis/backend/app/database.py
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=5,
    max_overflow=5,
)
# expire_on_commit=False 避免提交后对象立即过期
# MySQL 用 READ COMMITTED 避免 REPEATABLE READ 导致的跨连接不可见问题
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
