from datetime import date, datetime
from typing import Optional
from sqlalchemy import String, Integer, Date, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDMixin, TimestampMixin


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    plan: Mapped[str] = mapped_column(String(50), default="free")
    analysis_count_today: Mapped[int] = mapped_column(Integer, default=0)
    analysis_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    bonus_remaining: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
