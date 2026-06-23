# ai-customer-analysis/backend/app/routers/analysis.py
import logging
import uuid
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from pydantic import BaseModel
from app.database import async_session
from app.models.analysis_task import AnalysisTask
from app.services.analysis.orchestrator import Orchestrator

logger = logging.getLogger("uvicorn")
router = APIRouter(prefix="/api/analysis", tags=["analysis"])


class AnalysisRequest(BaseModel):
    input: str
    reanalyze_from: str | None = None


@router.post("", status_code=201)
async def create_analysis(req: AnalysisRequest):
    if not req.input.strip():
        raise HTTPException(status_code=400, detail="请输入公司名称或网址")

    task_id = str(uuid.uuid4())
    async with async_session() as db:
        task = AnalysisTask(id=task_id, input_text=req.input.strip(), status="pending")
        db.add(task)
        await db.flush()
        await db.commit()
        # 验证写入成功
        result = await db.execute(select(AnalysisTask).where(AnalysisTask.id == task_id))
        verify = result.scalar_one_or_none()
        if verify:
            logger.info(f"创建分析任务: {task_id} (已验证写入)")
        else:
            logger.error(f"写入验证失败: {task_id}")

    return {"task_id": task_id}


@router.get("/{task_id}")
async def get_task(task_id: str):
    try:
        tid = task_id  # MySQL VARCHAR(36)，直接用字符串
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的任务ID")

    async with async_session() as db:
        result = await db.execute(select(AnalysisTask).where(AnalysisTask.id == tid))
        task = result.scalar_one_or_none()

    if not task:
        logger.warning(f"查询不到任务: {task_id}")
        raise HTTPException(status_code=404, detail="任务不存在")

    return {
        "task_id": str(task.id),
        "status": task.status,
        "input_text": task.input_text,
        "company_context": task.company_context,
        "company_analysis": task.company_analysis,
        "sales_analysis": task.sales_analysis,
        "messages": task.messages,
        "error_info": task.error_info,
        "total_duration_ms": task.total_duration_ms,
        "generated_at": task.generated_at.isoformat() if task.generated_at else None,
        "created_at": task.created_at.isoformat() if task.created_at else None,
    }


@router.get("/{task_id}/stream")
async def stream_analysis(task_id: str, request: Request):
    try:
        tid = task_id  # MySQL VARCHAR(36)，直接用字符串
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的任务ID")

    task = None
    for attempt in range(5):
        async with async_session() as db:
            result = await db.execute(select(AnalysisTask).where(AnalysisTask.id == tid))
            task = result.scalar_one_or_none()
        if task:
            break
        logger.warning(f"重试 {attempt + 1}/5: 任务 {task_id} 暂时不可见")
        import asyncio
        await asyncio.sleep(0.3)
    else:
        logger.error(f"重试5次后仍找不到任务: {task_id}")
        raise HTTPException(status_code=404, detail="任务不存在")

    logger.info(f"开始 SSE 流: {task_id}")
    async def event_stream():
        orchestrator = Orchestrator()
        # Check if already completed
        if task.status in ("success", "partial_success", "failed"):
            # Replay stored results
            if task.company_context:
                import json as _json
                yield f"event: search_complete\ndata: {_json.dumps(task.company_context, ensure_ascii=False)}\n\n"
            if task.company_analysis:
                yield f"event: company_analysis\ndata: {_json.dumps(task.company_analysis, ensure_ascii=False)}\n\n"
            if task.sales_analysis:
                yield f"event: sales_analysis\ndata: {_json.dumps(task.sales_analysis, ensure_ascii=False)}\n\n"
            if task.messages:
                yield f"event: messages\ndata: {_json.dumps(task.messages, ensure_ascii=False)}\n\n"
            yield "event: done\ndata: {}\n\n"
            return

        async for event_str in orchestrator.run(tid, task.input_text):
            # Check if client disconnected
            if await request.is_disconnected():
                break
            yield event_str

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
