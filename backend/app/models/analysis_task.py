import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.mysql import JSON
from app.models.base import Base, UUIDMixin, TimestampMixin


class AnalysisTask(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "analysis_tasks"

    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    input_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )
    company_context: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    company_analysis: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    sales_analysis: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    messages: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error_info: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    total_duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class UsageLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "usage_logs"

    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    task_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_tasks.id"), nullable=False
    )
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
