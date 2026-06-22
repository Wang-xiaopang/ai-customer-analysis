# ai-customer-analysis/backend/app/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, async_session


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.models import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="AI客户分析助手", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from app.routers import analysis, history, account

app.include_router(analysis.router)
app.include_router(history.router)
app.include_router(account.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
