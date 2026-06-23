# ai-customer-analysis/backend/app/routers/history.py
from fastapi import APIRouter, HTTPException
from sqlalchemy import select, desc
from app.database import async_session
from app.models.analysis_task import AnalysisTask

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("")
async def list_history(limit: int = 20, offset: int = 0):
    async with async_session() as db:
        result = await db.execute(
            select(AnalysisTask)
            .where(AnalysisTask.status.in_(["success", "partial_success"]))
            .order_by(desc(AnalysisTask.created_at))
            .offset(offset)
            .limit(limit)
        )
        tasks = result.scalars().all()

    return [
        {
            "task_id": str(t.id),
            "company_name": (t.company_context or {}).get("company_name", "") or t.input_text,
            "status": t.status,
            "generated_at": t.generated_at.isoformat() if t.generated_at else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in tasks
    ]


@router.get("/{task_id}")
async def get_history_report(task_id: str):
    # MySQL VARCHAR(36)，直接用字符串，不用 uuid.UUID 转换
    tid = task_id

    async with async_session() as db:
        result = await db.execute(select(AnalysisTask).where(AnalysisTask.id == tid))
        task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    return {
        "task_id": str(task.id),
        "input_text": task.input_text,
        "status": task.status,
        "company_context": task.company_context,
        "company_analysis": task.company_analysis,
        "sales_analysis": task.sales_analysis,
        "messages": task.messages,
        "error_info": task.error_info,
        "generated_at": task.generated_at.isoformat() if task.generated_at else None,
        "created_at": task.created_at.isoformat() if task.created_at else None,
    }
