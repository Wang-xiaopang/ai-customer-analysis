import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import Base, UUIDMixin, TimestampMixin


class AnalysisTask(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "analysis_tasks"

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    input_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending/running/success/partial_success/failed
    company_context: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    company_analysis: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    sales_analysis: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    messages: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    error_info: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    total_duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    generated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class UsageLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "usage_logs"

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("analysis_tasks.id"), nullable=False
    )
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
