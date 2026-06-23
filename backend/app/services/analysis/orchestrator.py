# ai-customer-analysis/backend/app/services/analysis/orchestrator.py
import asyncio
import json
import logging
import time
import traceback
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from sqlalchemy import select

from app.config import settings

logger = logging.getLogger("uvicorn")
from app.database import async_session
from app.models.analysis_task import AnalysisTask, UsageLog
from app.services.analysis.search_service import SearchService
from app.services.analysis.company_analyzer import CompanyAnalyzer
from app.services.analysis.sales_analyzer import SalesAnalyzer
from app.services.analysis.message_generator import MessageGenerator


class Orchestrator:
    def __init__(self):
        self.search = SearchService()
        self.company_analyzer = CompanyAnalyzer()
        self.sales_analyzer = SalesAnalyzer()
        self.message_generator = MessageGenerator()
        self.timeout = settings.analysis_timeout_seconds

    def _sse_event(self, event: str, data: dict | None = None) -> str:
        payload = json.dumps(data or {}, ensure_ascii=False)
        return f"event: {event}\ndata: {payload}\n\n"

    async def run(
        self, task_id: str, input_text: str
    ) -> AsyncGenerator[str, None]:
        """Run 4-stage analysis, yield SSE events as strings."""
        start_time = time.time()
        company_context = None
        company_analysis = None
        sales_analysis = None
        messages = None
        failed_stages: list[str] = []
        ip_address = "127.0.0.1"  # Will be set by caller via request

        async def update_db_status(status: str):
            async with async_session() as db:
                result = await db.execute(
                    select(AnalysisTask).where(AnalysisTask.id == task_id)
                )
                task = result.scalar_one_or_none()
                if task:
                    task.status = status
                    if status in ("success", "partial_success", "failed"):
                        task.completed_at = datetime.now(timezone.utc)
                        task.total_duration_ms = int(
                            (time.time() - start_time) * 1000
                        )
                    await db.commit()

        async def save_stage_result(stage_name: str, data: dict):
            async with async_session() as db:
                result = await db.execute(
                    select(AnalysisTask).where(AnalysisTask.id == task_id)
                )
                task = result.scalar_one_or_none()
                if task:
                    setattr(task, stage_name, data)
                    await db.commit()

        # Update status to RUNNING
        await update_db_status("running")

        # --- Stage 1: Search ---
        logger.info("阶段1: 开始搜索...")
        yield self._sse_event("stage_start", {"stage": "search"})
        try:
            company_context = await asyncio.wait_for(
                self.search.search(input_text), timeout=10
            )
            await save_stage_result("company_context", company_context)
            logger.info(f"阶段1完成: 搜索到 {len(company_context.get('news', []))} 条结果, 置信度 {company_context.get('data_confidence', {}).get('score', '?')}%")
            yield self._sse_event("search_complete", company_context)
            await asyncio.sleep(1)  # 给前端时间渲染阶段1完成
        except asyncio.TimeoutError:
            logger.error("阶段1超时: 搜索超过18秒")
            failed_stages.append("search")
            yield self._sse_event("error", {"stage": "search", "message": "搜索超时，请稍后重试"})
            await update_db_status("failed")
            return
        except Exception as e:
            logger.error(f"阶段1失败: {e}")
            failed_stages.append("search")
            yield self._sse_event("error", {"stage": "search", "message": str(e)}
            )
            await update_db_status("failed")
            return

        # --- Stage 2: Company Analysis ---
        logger.info("阶段2: 开始企业分析...")
        yield self._sse_event("stage_start", {"stage": "company_analysis"})
        try:
            remaining = self.timeout - (time.time() - start_time)
            if remaining <= 0:
                raise asyncio.TimeoutError("总超时")
            company_analysis = await asyncio.wait_for(
                self.company_analyzer.analyze(company_context), timeout=remaining
            )
            await save_stage_result("company_analysis", company_analysis)
            logger.info("阶段2完成: 企业分析")
            yield self._sse_event("company_analysis", company_analysis)
            await asyncio.sleep(1)  # 给前端时间渲染阶段2完成
        except asyncio.TimeoutError:
            logger.error("阶段2超时")
            failed_stages.append("company_analysis")
            yield self._sse_event("stage_failed", {"stage": "company_analysis", "retry": True})
        except Exception as e:
            logger.error(f"阶段2失败: {e}")
            failed_stages.append("company_analysis")
            yield self._sse_event("error", {"stage": "company_analysis", "message": str(e)})

        # --- Stage 3: Sales Analysis ---
        if company_analysis:
            logger.info("阶段3: 开始销售分析...")
            yield self._sse_event("stage_start", {"stage": "sales_analysis"})
            try:
                remaining = self.timeout - (time.time() - start_time)
                if remaining <= 0:
                    raise asyncio.TimeoutError("总超时")
                sales_analysis = await asyncio.wait_for(
                    self.sales_analyzer.analyze(company_context, company_analysis),
                    timeout=remaining,
                )
                await save_stage_result("sales_analysis", sales_analysis)
                logger.info("阶段3完成: 销售分析")
                yield self._sse_event("sales_analysis", sales_analysis)
                await asyncio.sleep(1)  # 给前端时间渲染阶段3完成
            except asyncio.TimeoutError:
                logger.error("阶段3超时")
                failed_stages.append("sales_analysis")
                yield self._sse_event("stage_failed", {"stage": "sales_analysis", "retry": True})
            except Exception as e:
                logger.error(f"阶段3失败: {e}")
                failed_stages.append("sales_analysis")
                yield self._sse_event("error", {"stage": "sales_analysis", "message": str(e)})

        # --- Stage 4: Message Generation ---
        if company_analysis and sales_analysis:
            logger.info("阶段4: 开始生成开发信...")
            yield self._sse_event("stage_start", {"stage": "messages"})
            try:
                remaining = self.timeout - (time.time() - start_time)
                if remaining <= 0:
                    raise asyncio.TimeoutError("总超时")
                messages = await asyncio.wait_for(
                    self.message_generator.generate(
                        company_context, company_analysis, sales_analysis
                    ),
                    timeout=remaining,
                )
                await save_stage_result("messages", messages)
                logger.info("阶段4完成: 开发信生成")
                yield self._sse_event("messages", messages)
            except asyncio.TimeoutError:
                logger.error("阶段4超时")
                failed_stages.append("messages")
                yield self._sse_event("stage_failed", {"stage": "messages", "retry": True})
            except Exception as e:
                logger.error(f"阶段4失败: {e}")
                failed_stages.append("messages")
                yield self._sse_event("error", {"stage": "messages", "message": str(e)})

        # --- Determine final status ---
        completed_stages = 4 - len(failed_stages)
        if completed_stages == 0:
            await update_db_status("failed")
        elif failed_stages:
            await update_db_status("partial_success")
            error_info = {"failed_stages": failed_stages}
            async with async_session() as db:
                result = await db.execute(
                    select(AnalysisTask).where(AnalysisTask.id == task_id)
                )
                task = result.scalar_one_or_none()
                if task:
                    task.error_info = error_info
                    await db.commit()
        else:
            await update_db_status("success")

        # Set generated_at timestamp
        async with async_session() as db:
            result = await db.execute(
                select(AnalysisTask).where(AnalysisTask.id == task_id)
            )
            task = result.scalar_one_or_none()
            if task:
                task.generated_at = datetime.now(timezone.utc)
                task.total_duration_ms = int(
                    (time.time() - start_time) * 1000
                )
                await db.commit()

        # Record usage log
        async with async_session() as db:
            log = UsageLog(task_id=task_id, ip_address=ip_address)
            db.add(log)
            await db.commit()

        yield self._sse_event("done", {})
