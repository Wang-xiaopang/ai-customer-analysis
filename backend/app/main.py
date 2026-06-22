# ai-customer-analysis/backend/app/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, async_session
from app.middleware.rate_limit import check_rate_limit


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.models import Base
    import logging

    logger = logging.getLogger("uvicorn")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.warning(f"Database connection failed (tables not created): {e}")
        logger.warning("App will start without database — analysis will fail until DB is available")
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


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    try:
        await check_rate_limit(request)
    except HTTPException as e:
        from fastapi.responses import JSONResponse

        return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
    response = await call_next(request)
    return response


from app.routers import analysis, history, account

app.include_router(analysis.router)
app.include_router(history.router)
app.include_router(account.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
