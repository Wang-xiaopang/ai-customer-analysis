from datetime import date
from fastapi import Request, HTTPException
from sqlalchemy import select, func
from app.database import async_session
from app.models.analysis_task import UsageLog


async def check_rate_limit(request: Request):
    """Check if guest user has exceeded daily limit. V1 simple IP check."""
    if request.url.path != "/api/analysis" or request.method != "POST":
        return

    ip = request.client.host if request.client else "unknown"
    today = date.today()

    async with async_session() as db:
        result = await db.execute(
            select(func.count(UsageLog.id)).where(
                UsageLog.ip_address == ip,
                func.date(UsageLog.created_at) == today,
            )
        )
        count_today = result.scalar() or 0

    if count_today >= 3:
        raise HTTPException(
            status_code=429,
            detail="今日免费分析次数已用完（3次/天）。请输入邮箱获取额外10次。",
        )
