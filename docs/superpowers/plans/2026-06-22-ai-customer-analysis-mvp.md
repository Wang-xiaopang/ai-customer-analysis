# AI客户分析助手 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an MVP web app where B2B sales enter a company name/URL, and within 30 seconds receive a structured customer intelligence report (Executive Summary → Data Confidence → Score → Profile → Signals → Needs → Entry Points → Contact Strategy → Next Actions → Outreach Messages).

**Architecture:** Monorepo with Next.js 15 frontend and FastAPI backend. Analysis runs as a 4-stage serial pipeline (Search → Company Analysis → Sales Analysis → Message Generation) with shared context. Each stage's result is pushed to the frontend via SSE. All conclusions follow C-R-E principle (Conclusion → Reason → Evidence).

**Tech Stack:** Next.js 15 (App Router), Shadcn/ui + Tailwind CSS, FastAPI, PostgreSQL, DeepSeek (via Provider abstraction), SerpAPI, SSE, Docker Compose.

## Global Constraints

- Next.js 15 with App Router, shadcn/ui + Tailwind CSS for frontend
- FastAPI with async SQLAlchemy + asyncpg for backend
- All LLM calls go through `llm/factory.py` — never call provider directly
- All analysis conclusions follow C-R-E: Conclusion → Reason → Evidence
- Guest mode: no login, 3 free analyses/day via localStorage + IP fallback
- V1 no: agent, CRM, auto-email, WeCom/Feishu, RAG, multi-model routing, payment system, PDF/Excel export, OAuth, verification codes
- SSE event types: `search_complete`, `company_analysis`, `sales_analysis`, `messages`, `error`, `stage_failed`, `done`
- Task states: PENDING → RUNNING → SUCCESS | PARTIAL_SUCCESS | FAILED
- Total analysis timeout: 30 seconds
- Input type auto-detection: company name vs URL vs description
- All prompts stored in `backend/app/prompts/*.txt`

---

### Task 1: Monorepo scaffold and Docker setup

**Files:**
- Create: `ai-customer-analysis/docker-compose.dev.yml`
- Create: `ai-customer-analysis/backend/requirements.txt`
- Create: `ai-customer-analysis/frontend/package.json`
- Create: `ai-customer-analysis/backend/.env.example`
- Create: `ai-customer-analysis/.gitignore`

**Interfaces:**
- Produces: Working `docker compose up` that starts PostgreSQL on port 5432

- [ ] **Step 1: Create root .gitignore**

```gitignore
# ai-customer-analysis/.gitignore
node_modules/
.next/
__pycache__/
*.pyc
.env
.venv/
*.egg-info/
dist/
.DS_Store
```

- [ ] **Step 2: Create docker-compose.dev.yml**

```yaml
# ai-customer-analysis/docker-compose.dev.yml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: customer_analysis
      POSTGRES_PASSWORD: customer_analysis_dev
      POSTGRES_DB: customer_analysis
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 3: Create backend requirements.txt**

```text
# ai-customer-analysis/backend/requirements.txt
fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy[asyncio]==2.0.36
asyncpg==0.30.0
pydantic==2.10.3
pydantic-settings==2.7.0
httpx==0.28.1
openai==1.58.1
python-dotenv==1.0.1
alembic==1.14.0
```

- [ ] **Step 4: Create backend .env.example**

```env
# ai-customer-analysis/backend/.env.example
DATABASE_URL=postgresql+asyncpg://customer_analysis:customer_analysis_dev@localhost:5432/customer_analysis
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
SERPAPI_API_KEY=your-serpapi-key
CORS_ORIGIN=http://localhost:3000
```

- [ ] **Step 5: Create frontend package.json**

```json
{
  "name": "ai-customer-analysis-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.468.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **Step 6: Start PostgreSQL and verify**

```bash
cd ai-customer-analysis && docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
```

Expected: `db` service is `Up` and healthy.

- [ ] **Step 7: Commit**

```bash
cd ai-customer-analysis && git init && git add -A && git commit -m "feat: monorepo scaffold with docker compose"
```

---

### Task 2: Backend FastAPI skeleton with DB connection

**Files:**
- Create: `ai-customer-analysis/backend/app/__init__.py`
- Create: `ai-customer-analysis/backend/app/main.py`
- Create: `ai-customer-analysis/backend/app/config.py`

**Interfaces:**
- Consumes: PostgreSQL running from Task 1
- Produces: `app.config.Settings` (pydantic-settings, reads from .env)
- Produces: FastAPI app with CORS, health check at `GET /api/health`

- [ ] **Step 1: Create config.py**

```python
# ai-customer-analysis/backend/app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://customer_analysis:customer_analysis_dev@localhost:5432/customer_analysis"
    llm_provider: str = "deepseek"
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"
    serpapi_api_key: str = ""
    cors_origin: str = "http://localhost:3000"
    analysis_timeout_seconds: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 2: Create main.py with DB engine and health check**

```python
# ai-customer-analysis/backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
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


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 3: Test health endpoint**

```bash
cd ai-customer-analysis/backend && cp .env.example .env && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 &
sleep 2
curl http://localhost:8000/api/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 4: Commit**

```bash
git add backend/app/__init__.py backend/app/main.py backend/app/config.py
git commit -m "feat: FastAPI skeleton with DB engine and health check"
```

---

### Task 3: Database models (SQLAlchemy + Alembic)

**Files:**
- Create: `ai-customer-analysis/backend/app/models/__init__.py`
- Create: `ai-customer-analysis/backend/app/models/base.py`
- Create: `ai-customer-analysis/backend/app/models/user.py`
- Create: `ai-customer-analysis/backend/app/models/analysis_task.py`

**Interfaces:**
- Consumes: `app.main.engine`, `app.main.async_session`
- Produces: `User` model (id, email, plan, analysis_count_today, analysis_date, bonus_remaining, created_at, updated_at)
- Produces: `AnalysisTask` model (id, user_id, input_text, status, company_context, company_analysis, sales_analysis, messages, error_info, total_duration_ms, generated_at, created_at, completed_at)
- Produces: `UsageLog` model (id, user_id, task_id, ip_address, created_at)

- [ ] **Step 1: Create base model**

```python
# ai-customer-analysis/backend/app/models/base.py
import uuid
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class UUIDMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
```

- [ ] **Step 2: Create User model**

```python
# ai-customer-analysis/backend/app/models/user.py
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
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 3: Create AnalysisTask model**

```python
# ai-customer-analysis/backend/app/models/analysis_task.py
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
```

- [ ] **Step 4: Create models __init__.py**

```python
# ai-customer-analysis/backend/app/models/__init__.py
from app.models.base import Base
from app.models.user import User
from app.models.analysis_task import AnalysisTask, UsageLog

__all__ = ["Base", "User", "AnalysisTask", "UsageLog"]
```

- [ ] **Step 5: Run model creation via startup event, test**

Add to `main.py` lifespan:
```python
# Add after engine creation in main.py
from app.models import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()
```

Verify tables exist:
```bash
docker compose -f docker-compose.dev.yml exec db psql -U customer_analysis -d customer_analysis -c "\dt"
```

Expected: `users`, `analysis_tasks`, `usage_logs` tables listed.

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/
git commit -m "feat: database models for users, analysis_tasks, usage_logs"
```

---

### Task 4: LLM Provider abstraction layer

**Files:**
- Create: `ai-customer-analysis/backend/app/llm/__init__.py`
- Create: `ai-customer-analysis/backend/app/llm/base.py`
- Create: `ai-customer-analysis/backend/app/llm/deepseek.py`
- Create: `ai-customer-analysis/backend/app/llm/openai.py`
- Create: `ai-customer-analysis/backend/app/llm/factory.py`

**Interfaces:**
- Consumes: `app.config.settings`
- Produces: `get_llm() -> BaseLLMProvider` factory function
- Produces: `BaseLLMProvider.chat(messages, **kwargs) -> str`
- Produces: `BaseLLMProvider.chat_json(messages, schema, **kwargs) -> dict`

- [ ] **Step 1: Create abstract base**

```python
# ai-customer-analysis/backend/app/llm/base.py
from abc import ABC, abstractmethod


class BaseLLMProvider(ABC):
    @abstractmethod
    async def chat(self, messages: list[dict], **kwargs) -> str:
        """Send chat request, return text response."""
        pass

    @abstractmethod
    async def chat_json(self, messages: list[dict], json_schema: dict, **kwargs) -> dict:
        """Send chat request with structured JSON output."""
        pass
```

- [ ] **Step 2: Create DeepSeek provider**

```python
# ai-customer-analysis/backend/app/llm/deepseek.py
import json
from openai import AsyncOpenAI
from app.config import settings
from app.llm.base import BaseLLMProvider


class DeepSeekProvider(BaseLLMProvider):
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )
        self.model = settings.deepseek_model

    async def chat(self, messages: list[dict], **kwargs) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=kwargs.get("temperature", 0.3),
            max_tokens=kwargs.get("max_tokens", 4096),
        )
        return response.choices[0].message.content or ""

    async def chat_json(self, messages: list[dict], json_schema: dict, **kwargs) -> dict:
        schema_str = json.dumps(json_schema, ensure_ascii=False, indent=2)
        system_msg = messages[0]["content"] if messages and messages[0]["role"] == "system" else ""
        messages[0] = {
            "role": "system",
            "content": f"{system_msg}\n\nYou MUST respond with valid JSON that matches this schema:\n{schema_str}\nOutput ONLY the JSON object, no other text.",
        }
        text = await self.chat(messages, **kwargs)
        # Strip markdown code fences if present
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        return json.loads(text)
```

- [ ] **Step 3: Create OpenAI provider (spare)**

```python
# ai-customer-analysis/backend/app/llm/openai.py
import json
from openai import AsyncOpenAI
from app.config import settings
from app.llm.base import BaseLLMProvider


class OpenAIProvider(BaseLLMProvider):
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4o-mini"

    async def chat(self, messages: list[dict], **kwargs) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=kwargs.get("temperature", 0.3),
            max_tokens=kwargs.get("max_tokens", 4096),
        )
        return response.choices[0].message.content or ""

    async def chat_json(self, messages: list[dict], json_schema: dict, **kwargs) -> dict:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=kwargs.get("temperature", 0.3),
            max_tokens=kwargs.get("max_tokens", 4096),
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content or "{}")
```

- [ ] **Step 4: Create factory**

```python
# ai-customer-analysis/backend/app/llm/factory.py
from app.config import settings
from app.llm.base import BaseLLMProvider
from app.llm.deepseek import DeepSeekProvider
from app.llm.openai import OpenAIProvider

_providers = {
    "deepseek": DeepSeekProvider,
    "openai": OpenAIProvider,
}

_llm_instance: BaseLLMProvider | None = None


def get_llm() -> BaseLLMProvider:
    global _llm_instance
    if _llm_instance is None:
        provider_class = _providers.get(settings.llm_provider, DeepSeekProvider)
        _llm_instance = provider_class()
    return _llm_instance
```

- [ ] **Step 5: Create llm __init__.py**

```python
# ai-customer-analysis/backend/app/llm/__init__.py
from app.llm.factory import get_llm
from app.llm.base import BaseLLMProvider

__all__ = ["get_llm", "BaseLLMProvider"]
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/llm/
git commit -m "feat: LLM Provider abstraction layer with DeepSeek and OpenAI"
```

---

### Task 5: Prompt files

**Files:**
- Create: `ai-customer-analysis/backend/app/prompts/__init__.py`
- Create: `ai-customer-analysis/backend/app/prompts/company_analysis.txt`
- Create: `ai-customer-analysis/backend/app/prompts/sales_analysis.txt`
- Create: `ai-customer-analysis/backend/app/prompts/outreach_generation.txt`
- Create: `ai-customer-analysis/backend/app/prompts/loader.py`

**Interfaces:**
- Produces: `load_prompt(name: str) -> str`

- [ ] **Step 1: Create prompt loader**

```python
# ai-customer-analysis/backend/app/prompts/loader.py
from pathlib import Path

_PROMPTS_DIR = Path(__file__).parent

_cache: dict[str, str] = {}


def load_prompt(name: str) -> str:
    if name not in _cache:
        filepath = _PROMPTS_DIR / f"{name}.txt"
        if not filepath.exists():
            raise FileNotFoundError(f"Prompt file not found: {filepath}")
        _cache[name] = filepath.read_text(encoding="utf-8")
    return _cache[name]
```

- [ ] **Step 2: Create company_analysis.txt prompt**

```text
# ai-customer-analysis/backend/app/prompts/company_analysis.txt
你是一位资深的企业分析师。基于提供的公司公开信息，生成一份结构化的企业分析报告。

## 输入数据
你将收到一个 company_context JSON，包含公司名称、官网内容、新闻列表等信息。

## C-R-E 强制规则
- 每个结论必须有原因（reason）
- 每个原因必须有证据（evidence），证据必须来自输入数据中的公开信息
- 每个证据必须标注来源URL（source），如果输入中有的话
- 如果无法找到证据，标注"信息不足，以下为基于行业经验的推测"，不得编造

## 输出格式
严格按照以下 JSON Schema 输出：
{
  "company_profile": {
    "industry": "所属行业",
    "scale": "企业规模（如：超大型企业、中型企业、小型企业、初创企业）",
    "stage": "发展阶段（如：初创期、成长期、成熟期、转型期）",
    "main_business": "主营业务描述"
  },
  "signals": [
    {
      "signal": "识别到的信号（如：企业正在扩张）",
      "reason": "判断原因",
      "evidence": "具体证据",
      "source": "证据来源URL"
    }
  ],
  "recent_updates": [
    {
      "title": "更新标题",
      "description": "更新描述",
      "evidence": "证据",
      "source": "来源URL"
    }
  ],
  "risks": [
    {
      "risk": "潜在风险",
      "reason": "判断原因",
      "evidence": "证据",
      "source": "来源URL"
    }
  ]
}

## 约束
- signals 至少列出1-3个关键信号
- 所有字段用中文输出
- 不要编造任何信息
- 不确定的信息标注"信息不足"
```

- [ ] **Step 3: Create sales_analysis.txt prompt**

```text
# ai-customer-analysis/backend/app/prompts/sales_analysis.txt
你是一位资深的销售策略顾问。基于提供的企业信息，生成销售分析报告。

## 输入数据
你将收到：
1. company_context：公司基本信息和搜索数据
2. company_analysis：企业分析结果（画像、信号、动态、风险）

## C-R-E 强制规则
- 所有推论必须基于 company_analysis 中的事实信号
- 每个需求、切入点的 evidence 字段必须引用 company_analysis 中的具体信号
- customer_score 的 factors 必须列出具体的评分依据

## 输出格式
严格按照以下 JSON Schema 输出：
{
  "customer_score": {
    "score": 85,
    "level": "A",
    "reason": "综合评分原因",
    "factors": ["评分因素1", "评分因素2", "评分因素3"]
  },
  "potential_needs": [
    {
      "need": "需求名称",
      "priority": "高",
      "reason": "判断原因",
      "evidence": "证据（引用自企业分析）"
    }
  ],
  "sales_entry_points": [
    {
      "direction": "切入方向",
      "reason": "切入原因",
      "evidence": "证据",
      "suggested_talk": "建议话术"
    }
  ],
  "contact_strategy": {
    "best_topic": "最佳切入话题",
    "reason": "原因",
    "avoid_topics": ["避免话题1", "避免话题2"],
    "recommended_channel": "推荐联系渠道"
  },
  "executive_summary": {
    "verdict": "recommended",
    "verdict_text": "推荐跟进",
    "customer_value": "高",
    "reasons": ["推荐原因1", "推荐原因2", "推荐原因3"],
    "suggested_contacts": ["建议联系人1", "建议联系人2"],
    "best_timing": "推荐时机（如：未来30天）"
  },
  "next_actions": [
    {
      "step": 1,
      "action": "具体行动步骤描述",
      "url": "相关URL（如无则为null）",
      "estimated_time": "预计耗时（如：3分钟）"
    }
  ]
}

## 约束
- customer_score.score 范围 0-100
- customer_score.level 按分数：A(80-100)、B(60-79)、C(40-59)、D(0-39)
- executive_summary.verdict 取值：recommended（推荐跟进）、cautious（谨慎跟进）、not_recommended（暂不建议）
- potential_needs 列出2-4个，按priority排序
- next_actions 列出3-5个步骤，总预计时间控制在10分钟左右
- 所有字段用中文输出
```

- [ ] **Step 4: Create outreach_generation.txt prompt**

```text
# ai-customer-analysis/backend/app/prompts/outreach_generation.txt
你是一位资深商务沟通专家。基于提供的客户分析结果，生成个性化开发信。

## 输入数据
你将收到：
1. company_context：公司基本信息
2. company_analysis：企业分析结果
3. sales_analysis：销售分析结果（含 executive_summary、potential_needs、contact_strategy）

## 原则
- 不要模板化话术，必须引用具体的分析发现
- 提及内容必须来源于 C-R-E 证据链，不得编造
- 语气专业但不生硬，展现对客户业务的理解
- 邮件版正式但不冗长，LinkedIn版简短直接，微信版更口语化

## 输出格式
严格按照以下 JSON Schema 输出：
{
  "email_message": "邮件正文（含主题建议在开头以【主题：xxx】标注）",
  "linkedin_message": "LinkedIn私信正文",
  "wechat_message": "微信消息正文"
}

## 约束
- 邮件版控制在200字以内
- LinkedIn版控制在100字以内
- 微信版控制在80字以内
- 三个版本必须基于相同的分析结论但表述方式适配各自渠道
```

- [ ] **Step 5: Create prompts __init__.py**

```python
# ai-customer-analysis/backend/app/prompts/__init__.py
from app.prompts.loader import load_prompt

__all__ = ["load_prompt"]
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/prompts/
git commit -m "feat: prompt files for 3 analysis stages with C-R-E constraints"
```

---

### Task 6: Search service (SerpAPI integration)

**Files:**
- Create: `ai-customer-analysis/backend/app/services/__init__.py`
- Create: `ai-customer-analysis/backend/app/services/analysis/__init__.py`
- Create: `ai-customer-analysis/backend/app/services/analysis/search_service.py`

**Interfaces:**
- Consumes: `app.config.settings` (serpapi_api_key)
- Produces: `SearchService.search(company_input: str) -> dict` (returns `company_context` dict)

- [ ] **Step 1: Create search_service.py**

```python
# ai-customer-analysis/backend/app/services/analysis/search_service.py
import re
import httpx
from app.config import settings


class SearchService:
    BASE_URL = "https://serpapi.com/search"

    def __init__(self):
        self.api_key = settings.serpapi_api_key

    def _detect_input_type(self, text: str) -> str:
        """Detect if input is URL, company name, or description."""
        text = text.strip()
        if re.match(r"^https?://", text):
            return "url"
        if len(text) > 100:
            return "description"
        return "company_name"

    async def search(self, company_input: str) -> dict:
        input_type = self._detect_input_type(company_input)

        if input_type == "url":
            website = company_input.strip()
            company_name = website  # Will be refined after scraping
        else:
            website = None
            company_name = company_input.strip()

        # Search for company info
        queries = [
            f"{company_name} 公司",
            f"{company_name} 招聘 2025",
            f"{company_name} 最新动态",
        ]

        all_news = []
        website_content = ""
        linkedin_found = False

        async with httpx.AsyncClient(timeout=15) as client:
            for query in queries[:2]:  # Limit to 2 searches to stay under 30s
                try:
                    resp = await client.get(
                        self.BASE_URL,
                        params={
                            "api_key": self.api_key,
                            "q": query,
                            "engine": "google",
                            "num": 5,
                            "gl": "cn",
                            "hl": "zh-cn",
                        },
                    )
                    data = resp.json()

                    # Extract organic results
                    for result in data.get("organic_results", []):
                        all_news.append({
                            "title": result.get("title", ""),
                            "url": result.get("link", ""),
                            "snippet": result.get("snippet", ""),
                            "date": result.get("date", ""),
                        })

                    # Check for LinkedIn
                    if not linkedin_found:
                        for r in data.get("organic_results", []):
                            if "linkedin.com/company" in r.get("link", "").lower():
                                linkedin_found = True
                                break

                except Exception:
                    continue  # Non-critical search failures are tolerated

        # Detect website from results if not provided
        if not website and all_news:
            for news in all_news:
                url = news.get("url", "")
                if url and not any(
                    d in url for d in ["linkedin.com", "facebook.com", "wikipedia.org", "zhihu.com", "weibo.com"]
                ):
                    # Extract domain as potential website
                    match = re.match(r"https?://([^/]+)", url)
                    if match:
                        website = f"https://{match.group(1)}"
                        break

        # Try to fetch website content
        if website:
            try:
                resp = await client.get(website, timeout=10, follow_redirects=True)
                # Simple text extraction from HTML
                html = resp.text
                # Strip HTML tags for basic content
                clean = re.sub(r"<[^>]+>", " ", html)
                clean = re.sub(r"\s+", " ", clean)
                website_content = clean[:3000]  # First 3000 chars
            except Exception:
                website_content = ""

        # Calculate data confidence
        confidence = self._calculate_confidence(
            has_website=bool(website_content),
            news_count=len(all_news),
            has_linkedin=linkedin_found,
        )

        return {
            "company_name": company_name,
            "website": website or "",
            "industry": "",
            "website_content": website_content,
            "news": all_news[:10],
            "data_confidence": confidence,
        }

    def _calculate_confidence(
        self, has_website: bool, news_count: int, has_linkedin: bool
    ) -> dict:
        score = 0
        detail_parts = []

        if has_website:
            score += 30
            detail_parts.append("获取到官网内容")
        if news_count >= 3:
            score += 25
            detail_parts.append(f"获取到{news_count}条新闻")
        elif news_count > 0:
            score += 10
            detail_parts.append(f"获取到{news_count}条新闻")
        if has_linkedin:
            score += 15
            detail_parts.append("获取到LinkedIn页面")

        # Industry detection is done by LLM, so we give base points
        score += 10  # Base confidence

        if score >= 80:
            level = "高"
        elif score >= 50:
            level = "中"
        else:
            level = "低"

        missing = []
        if not has_website:
            missing.append("官网内容")
        if news_count < 3:
            missing.append("新闻信息")
        if not has_linkedin:
            missing.append("LinkedIn页面")

        detail = "、".join(detail_parts) if detail_parts else "信息来源较少"
        if missing:
            detail += f"。未获取到：{'、'.join(missing)}"

        return {"score": min(score, 100), "level": level, "detail": detail}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/
git commit -m "feat: SerpAPI search service with data confidence scoring"
```

---

### Task 7: Analysis stage services (company, sales, message)

**Files:**
- Create: `ai-customer-analysis/backend/app/services/analysis/company_analyzer.py`
- Create: `ai-customer-analysis/backend/app/services/analysis/sales_analyzer.py`
- Create: `ai-customer-analysis/backend/app/services/analysis/message_generator.py`

**Interfaces:**
- Consumes: `get_llm()`, `load_prompt()`, stage input dicts
- Produces: `CompanyAnalyzer.analyze(company_context: dict) -> dict`
- Produces: `SalesAnalyzer.analyze(company_context: dict, company_analysis: dict) -> dict`
- Produces: `MessageGenerator.generate(company_context: dict, company_analysis: dict, sales_analysis: dict) -> dict`

- [ ] **Step 1: Create company_analyzer.py**

```python
# ai-customer-analysis/backend/app/services/analysis/company_analyzer.py
from app.llm import get_llm
from app.prompts import load_prompt

COMPANY_ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "company_profile": {
            "type": "object",
            "properties": {
                "industry": {"type": "string"},
                "scale": {"type": "string"},
                "stage": {"type": "string"},
                "main_business": {"type": "string"},
            },
            "required": ["industry", "scale", "stage", "main_business"],
        },
        "signals": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "signal": {"type": "string"},
                    "reason": {"type": "string"},
                    "evidence": {"type": "string"},
                    "source": {"type": "string"},
                },
                "required": ["signal", "reason", "evidence", "source"],
            },
        },
        "recent_updates": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "evidence": {"type": "string"},
                    "source": {"type": "string"},
                },
                "required": ["title", "description", "evidence", "source"],
            },
        },
        "risks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "risk": {"type": "string"},
                    "reason": {"type": "string"},
                    "evidence": {"type": "string"},
                    "source": {"type": "string"},
                },
                "required": ["risk", "reason", "evidence", "source"],
            },
        },
    },
    "required": ["company_profile", "signals", "recent_updates", "risks"],
}


class CompanyAnalyzer:
    def __init__(self):
        self.llm = get_llm()
        self.prompt = load_prompt("company_analysis")

    async def analyze(self, company_context: dict) -> dict:
        messages = [
            {"role": "system", "content": self.prompt},
            {"role": "user", "content": f"Company context:\n{company_context}"},
        ]
        return await self.llm.chat_json(messages, COMPANY_ANALYSIS_SCHEMA)
```

- [ ] **Step 2: Create sales_analyzer.py**

```python
# ai-customer-analysis/backend/app/services/analysis/sales_analyzer.py
from app.llm import get_llm
from app.prompts import load_prompt

SALES_ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "customer_score": {
            "type": "object",
            "properties": {
                "score": {"type": "integer", "minimum": 0, "maximum": 100},
                "level": {"type": "string", "enum": ["A", "B", "C", "D"]},
                "reason": {"type": "string"},
                "factors": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["score", "level", "reason", "factors"],
        },
        "potential_needs": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "need": {"type": "string"},
                    "priority": {"type": "string", "enum": ["高", "中", "低"]},
                    "reason": {"type": "string"},
                    "evidence": {"type": "string"},
                },
                "required": ["need", "priority", "reason", "evidence"],
            },
        },
        "sales_entry_points": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "direction": {"type": "string"},
                    "reason": {"type": "string"},
                    "evidence": {"type": "string"},
                    "suggested_talk": {"type": "string"},
                },
                "required": ["direction", "reason", "evidence", "suggested_talk"],
            },
        },
        "contact_strategy": {
            "type": "object",
            "properties": {
                "best_topic": {"type": "string"},
                "reason": {"type": "string"},
                "avoid_topics": {"type": "array", "items": {"type": "string"}},
                "recommended_channel": {"type": "string"},
            },
            "required": ["best_topic", "reason", "avoid_topics", "recommended_channel"],
        },
        "executive_summary": {
            "type": "object",
            "properties": {
                "verdict": {"type": "string", "enum": ["recommended", "cautious", "not_recommended"]},
                "verdict_text": {"type": "string"},
                "customer_value": {"type": "string"},
                "reasons": {"type": "array", "items": {"type": "string"}},
                "suggested_contacts": {"type": "array", "items": {"type": "string"}},
                "best_timing": {"type": "string"},
            },
            "required": ["verdict", "verdict_text", "customer_value", "reasons", "suggested_contacts", "best_timing"],
        },
        "next_actions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "step": {"type": "integer"},
                    "action": {"type": "string"},
                    "url": {"type": ["string", "null"]},
                    "estimated_time": {"type": "string"},
                },
                "required": ["step", "action", "estimated_time"],
            },
        },
    },
    "required": ["customer_score", "potential_needs", "sales_entry_points", "contact_strategy", "executive_summary", "next_actions"],
}


class SalesAnalyzer:
    def __init__(self):
        self.llm = get_llm()
        self.prompt = load_prompt("sales_analysis")

    async def analyze(self, company_context: dict, company_analysis: dict) -> dict:
        input_data = f"Company Context:\n{company_context}\n\nCompany Analysis:\n{company_analysis}"
        messages = [
            {"role": "system", "content": self.prompt},
            {"role": "user", "content": input_data},
        ]
        return await self.llm.chat_json(messages, SALES_ANALYSIS_SCHEMA)
```

- [ ] **Step 3: Create message_generator.py**

```python
# ai-customer-analysis/backend/app/services/analysis/message_generator.py
from app.llm import get_llm
from app.prompts import load_prompt

MESSAGES_SCHEMA = {
    "type": "object",
    "properties": {
        "email_message": {"type": "string"},
        "linkedin_message": {"type": "string"},
        "wechat_message": {"type": "string"},
    },
    "required": ["email_message", "linkedin_message", "wechat_message"],
}


class MessageGenerator:
    def __init__(self):
        self.llm = get_llm()
        self.prompt = load_prompt("outreach_generation")

    async def generate(
        self, company_context: dict, company_analysis: dict, sales_analysis: dict
    ) -> dict:
        input_data = (
            f"Company Context:\n{company_context}\n\n"
            f"Company Analysis:\n{company_analysis}\n\n"
            f"Sales Analysis:\n{sales_analysis}"
        )
        messages = [
            {"role": "system", "content": self.prompt},
            {"role": "user", "content": input_data},
        ]
        return await self.llm.chat_json(messages, MESSAGES_SCHEMA)
```

- [ ] **Step 4: Create services __init__.py files**

```python
# ai-customer-analysis/backend/app/services/__init__.py
# Package marker
```

```python
# ai-customer-analysis/backend/app/services/analysis/__init__.py
from app.services.analysis.search_service import SearchService
from app.services.analysis.company_analyzer import CompanyAnalyzer
from app.services.analysis.sales_analyzer import SalesAnalyzer
from app.services.analysis.message_generator import MessageGenerator

__all__ = ["SearchService", "CompanyAnalyzer", "SalesAnalyzer", "MessageGenerator"]
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/
git commit -m "feat: analysis stage services with JSON schema enforcement"
```

---

### Task 8: Analysis orchestrator with SSE

**Files:**
- Create: `ai-customer-analysis/backend/app/services/analysis/orchestrator.py`

**Interfaces:**
- Consumes: `SearchService`, `CompanyAnalyzer`, `SalesAnalyzer`, `MessageGenerator`, `app.config.settings`, `app.main.async_session`
- Produces: `Orchestrator.run(task_id: UUID, input_text: str) -> AsyncGenerator[str, None]` (yields SSE event strings)

- [ ] **Step 1: Create orchestrator.py**

```python
# ai-customer-analysis/backend/app/services/analysis/orchestrator.py
import asyncio
import json
import time
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from app.config import settings
from app.main import async_session
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

    async def run(self, task_id: uuid.UUID, input_text: str) -> str:
        """Run 4-stage analysis, yield SSE events as strings."""
        start_time = time.time()
        company_context = None
        company_analysis = None
        sales_analysis = None
        messages = None
        failed_stages = []
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
                        task.total_duration_ms = int((time.time() - start_time) * 1000)
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
        try:
            company_context = await asyncio.wait_for(
                self.search.search(input_text), timeout=15
            )
            await save_stage_result("company_context", company_context)
            yield self._sse_event("search_complete", company_context)
        except asyncio.TimeoutError:
            failed_stages.append("search")
            yield self._sse_event("error", {"stage": "search", "message": "搜索超时"})
            await update_db_status("failed")
            return
        except Exception as e:
            failed_stages.append("search")
            yield self._sse_event("error", {"stage": "search", "message": str(e)})
            await update_db_status("failed")
            return

        # --- Stage 2: Company Analysis ---
        try:
            remaining = self.timeout - (time.time() - start_time)
            if remaining <= 0:
                raise asyncio.TimeoutError("总超时")
            company_analysis = await asyncio.wait_for(
                self.company_analyzer.analyze(company_context), timeout=remaining
            )
            await save_stage_result("company_analysis", company_analysis)
            yield self._sse_event("company_analysis", company_analysis)
        except asyncio.TimeoutError:
            failed_stages.append("company_analysis")
            yield self._sse_event("stage_failed", {"stage": "company_analysis", "retry": True})
        except Exception as e:
            failed_stages.append("company_analysis")
            yield self._sse_event("error", {"stage": "company_analysis", "message": str(e)})

        # --- Stage 3: Sales Analysis ---
        if company_analysis:
            try:
                remaining = self.timeout - (time.time() - start_time)
                if remaining <= 0:
                    raise asyncio.TimeoutError("总超时")
                sales_analysis = await asyncio.wait_for(
                    self.sales_analyzer.analyze(company_context, company_analysis),
                    timeout=remaining,
                )
                await save_stage_result("sales_analysis", sales_analysis)
                yield self._sse_event("sales_analysis", sales_analysis)
            except asyncio.TimeoutError:
                failed_stages.append("sales_analysis")
                yield self._sse_event("stage_failed", {"stage": "sales_analysis", "retry": True})
            except Exception as e:
                failed_stages.append("sales_analysis")
                yield self._sse_event("error", {"stage": "sales_analysis", "message": str(e)})

        # --- Stage 4: Message Generation ---
        if company_analysis and sales_analysis:
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
                yield self._sse_event("messages", messages)
            except asyncio.TimeoutError:
                failed_stages.append("messages")
                yield self._sse_event("stage_failed", {"stage": "messages", "retry": True})
            except Exception as e:
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
                task.total_duration_ms = int((time.time() - start_time) * 1000)
                await db.commit()

        # Record usage log
        async with async_session() as db:
            log = UsageLog(task_id=task_id, ip_address=ip_address)
            db.add(log)
            await db.commit()

        yield self._sse_event("done", {})
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/analysis/orchestrator.py
git commit -m "feat: 4-stage analysis orchestrator with SSE event streaming"
```

---

### Task 9: API routes (analysis, history, account)

**Files:**
- Create: `ai-customer-analysis/backend/app/routers/__init__.py`
- Create: `ai-customer-analysis/backend/app/routers/analysis.py`
- Create: `ai-customer-analysis/backend/app/routers/history.py`
- Create: `ai-customer-analysis/backend/app/routers/account.py`

**Interfaces:**
- Consumes: `Orchestrator`, `AnalysisTask` model, `app.main.async_session`
- Produces: `POST /api/analysis` (creates task, returns task_id)
- Produces: `GET /api/analysis/{task_id}/stream` (SSE subscription)
- Produces: `GET /api/analysis/{task_id}` (get task status/results)
- Produces: `GET /api/history` (list past analyses)
- Produces: `GET /api/history/{task_id}` (get single report)
- Produces: `GET /api/account` (get plan info)

- [ ] **Step 1: Create analysis router**

```python
# ai-customer-analysis/backend/app/routers/analysis.py
import uuid
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from pydantic import BaseModel
from app.main import async_session
from app.models.analysis_task import AnalysisTask
from app.services.analysis.orchestrator import Orchestrator

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


class AnalysisRequest(BaseModel):
    input: str
    reanalyze_from: str | None = None


@router.post("", status_code=201)
async def create_analysis(req: AnalysisRequest):
    if not req.input.strip():
        raise HTTPException(status_code=400, detail="请输入公司名称或网址")

    task_id = uuid.uuid4()
    task = AnalysisTask(id=task_id, input_text=req.input.strip(), status="pending")
    async with async_session() as db:
        db.add(task)
        await db.commit()

    return {"task_id": str(task_id)}


@router.get("/{task_id}")
async def get_task(task_id: str):
    try:
        tid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的任务ID")

    async with async_session() as db:
        result = await db.execute(select(AnalysisTask).where(AnalysisTask.id == tid))
        task = result.scalar_one_or_none()

    if not task:
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
        tid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的任务ID")

    async with async_session() as db:
        result = await db.execute(select(AnalysisTask).where(AnalysisTask.id == tid))
        task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

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
```

- [ ] **Step 2: Create history router**

```python
# ai-customer-analysis/backend/app/routers/history.py
import uuid
from fastapi import APIRouter, HTTPException
from sqlalchemy import select, desc
from app.main import async_session
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
    try:
        tid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的任务ID")

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
```

- [ ] **Step 3: Create account router**

```python
# ai-customer-analysis/backend/app/routers/account.py
from fastapi import APIRouter

router = APIRouter(prefix="/api/account", tags=["account"])


@router.get("")
async def get_account():
    # V1: static response. No user auth yet.
    return {
        "plan": "free",
        "daily_limit": 3,
        "bonus_remaining": 0,
        "email": None,
    }
```

- [ ] **Step 4: Register routers in main.py**

Add to `main.py` after the health check:
```python
from app.routers import analysis, history, account

app.include_router(analysis.router)
app.include_router(history.router)
app.include_router(account.router)
```

- [ ] **Step 5: Create routers __init__.py**

```python
# ai-customer-analysis/backend/app/routers/__init__.py
# Package marker
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/
git commit -m "feat: API routes for analysis, history, and account"
```

---

### Task 10: Rate limit middleware

**Files:**
- Create: `ai-customer-analysis/backend/app/middleware/__init__.py`
- Create: `ai-customer-analysis/backend/app/middleware/rate_limit.py`

**Interfaces:**
- Consumes: FastAPI app, `UsageLog` model
- Produces: Middleware that checks daily usage before POST /api/analysis

- [ ] **Step 1: Create rate_limit.py**

```python
# ai-customer-analysis/backend/app/middleware/rate_limit.py
from datetime import date
from fastapi import Request, HTTPException
from sqlalchemy import select, func
from app.main import async_session
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
```

- [ ] **Step 2: Register middleware in main.py**

Add to `main.py`:
```python
from app.middleware.rate_limit import check_rate_limit

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    try:
        await check_rate_limit(request)
    except HTTPException as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
    response = await call_next(request)
    return response
```

- [ ] **Step 3: Create middleware __init__.py**

```python
# ai-customer-analysis/backend/app/middleware/__init__.py
# Package marker
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/middleware/
git commit -m "feat: IP-based rate limiting middleware (3/day for guests)"
```

---

### Task 11: Frontend Next.js scaffold with shadcn/ui

**Files:**
- Create: `ai-customer-analysis/frontend/tsconfig.json`
- Create: `ai-customer-analysis/frontend/next.config.ts`
- Create: `ai-customer-analysis/frontend/tailwind.config.ts`
- Create: `ai-customer-analysis/frontend/postcss.config.mjs`
- Create: `ai-customer-analysis/frontend/app/globals.css`
- Create: `ai-customer-analysis/frontend/app/layout.tsx`
- Create: `ai-customer-analysis/frontend/lib/utils.ts`

**Interfaces:**
- Produces: Working Next.js dev server with Tailwind and shadcn/ui primitives

- [ ] **Step 1: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "paths": {"@/*": ["./*"]}
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Create next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: async () => [
    {
      source: "/api/:path*",
      destination: "http://localhost:8000/api/:path*",
    },
  ],
};

export default nextConfig;
```

- [ ] **Step 3: Create tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

- [ ] **Step 4: Create postcss.config.mjs**

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
```

- [ ] **Step 5: Create globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --border: 214.3 31.8% 91.4%;
    --radius: 0.5rem;
  }
}
```

- [ ] **Step 6: Create lib/utils.ts**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 7: Create app/layout.tsx**

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI客户分析助手",
  description: "输入公司名称，30秒生成客户画像与销售策略",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-foreground antialiased">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <a href="/" className="text-lg font-bold text-primary">
              AI客户分析助手
            </a>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <a href="/history">历史记录</a>
              <a href="/account">账户</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Install dependencies and verify**

```bash
cd ai-customer-analysis/frontend && npm install && npm run dev &
sleep 3
curl http://localhost:3000
```

Expected: HTML response with "AI客户分析助手" in page.

- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "feat: Next.js 15 scaffold with Tailwind and shadcn/ui base"
```

---

### Task 12: Frontend - SearchInput + ProgressStage + SSE client + analysis page

**Files:**
- Create: `ai-customer-analysis/frontend/lib/sse-client.ts`
- Create: `ai-customer-analysis/frontend/lib/storage.ts`
- Create: `ai-customer-analysis/frontend/lib/types.ts`
- Create: `ai-customer-analysis/frontend/components/SearchInput.tsx`
- Create: `ai-customer-analysis/frontend/components/ProgressStage.tsx`
- Create: `ai-customer-analysis/frontend/app/page.tsx`

**Interfaces:**
- Consumes: Backend API at `/api/analysis`
- Produces: Working home page with search input, progress indicator, and SSE-driven result streaming

- [ ] **Step 1: Create types.ts**

```typescript
// ai-customer-analysis/frontend/lib/types.ts
export interface DataConfidence {
  score: number;
  level: "高" | "中" | "低";
  detail: string;
}

export interface CompanyContext {
  company_name: string;
  website: string;
  industry: string;
  website_content: string;
  news: { title: string; url: string; snippet: string; date: string }[];
  data_confidence: DataConfidence;
}

export interface Signal {
  signal: string;
  reason: string;
  evidence: string;
  source: string;
}

export interface CompanyProfile {
  industry: string;
  scale: string;
  stage: string;
  main_business: string;
}

export interface CompanyAnalysis {
  company_profile: CompanyProfile;
  signals: Signal[];
  recent_updates: { title: string; description: string; evidence: string; source: string }[];
  risks: { risk: string; reason: string; evidence: string; source: string }[];
}

export interface CustomerScore {
  score: number;
  level: string;
  reason: string;
  factors: string[];
}

export interface PotentialNeed {
  need: string;
  priority: string;
  reason: string;
  evidence: string;
}

export interface SalesEntryPoint {
  direction: string;
  reason: string;
  evidence: string;
  suggested_talk: string;
}

export interface ContactStrategy {
  best_topic: string;
  reason: string;
  avoid_topics: string[];
  recommended_channel: string;
}

export interface ExecutiveSummary {
  verdict: "recommended" | "cautious" | "not_recommended";
  verdict_text: string;
  customer_value: string;
  reasons: string[];
  suggested_contacts: string[];
  best_timing: string;
}

export interface NextAction {
  step: number;
  action: string;
  url: string | null;
  estimated_time: string;
}

export interface SalesAnalysis {
  customer_score: CustomerScore;
  potential_needs: PotentialNeed[];
  sales_entry_points: SalesEntryPoint[];
  contact_strategy: ContactStrategy;
  executive_summary: ExecutiveSummary;
  next_actions: NextAction[];
}

export interface Messages {
  email_message: string;
  linkedin_message: string;
  wechat_message: string;
}

export type AnalysisStage = "search" | "company_analysis" | "sales_analysis" | "messages" | "done";

export interface StageStatus {
  stage: AnalysisStage;
  label: string;
  status: "pending" | "running" | "success" | "failed";
}
```

- [ ] **Step 2: Create storage.ts**

```typescript
// ai-customer-analysis/frontend/lib/storage.ts
const STORAGE_KEYS = {
  analysisCount: "analysis_count",
  analysisDate: "analysis_date",
  email: "email",
  bonusRemaining: "bonus_remaining",
} as const;

export function getTodayAnalysisCount(): number {
  if (typeof window === "undefined") return 0;
  const today = new Date().toISOString().slice(0, 10);
  const storedDate = localStorage.getItem(STORAGE_KEYS.analysisDate);
  if (storedDate !== today) {
    localStorage.setItem(STORAGE_KEYS.analysisDate, today);
    localStorage.setItem(STORAGE_KEYS.analysisCount, "0");
    return 0;
  }
  return parseInt(localStorage.getItem(STORAGE_KEYS.analysisCount) || "0", 10);
}

export function incrementAnalysisCount(): number {
  const count = getTodayAnalysisCount() + 1;
  localStorage.setItem(STORAGE_KEYS.analysisCount, String(count));
  return count;
}

export function getBonusRemaining(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(STORAGE_KEYS.bonusRemaining) || "0", 10);
}

export function setBonusRemaining(count: number) {
  localStorage.setItem(STORAGE_KEYS.bonusRemaining, String(count));
}

export function canAnalyze(): boolean {
  const daily = getTodayAnalysisCount();
  const bonus = getBonusRemaining();
  return daily < 3 || bonus > 0;
}

export function getStoredEmail(): string | null {
  return localStorage.getItem(STORAGE_KEYS.email);
}

export function setStoredEmail(email: string) {
  localStorage.setItem(STORAGE_KEYS.email, email);
  setBonusRemaining(10);
}
```

- [ ] **Step 3: Create sse-client.ts**

```typescript
// ai-customer-analysis/frontend/lib/sse-client.ts
import type { CompanyContext, CompanyAnalysis, SalesAnalysis, Messages } from "./types";

type SSECallback = {
  onSearchComplete?: (data: CompanyContext) => void;
  onCompanyAnalysis?: (data: CompanyAnalysis) => void;
  onSalesAnalysis?: (data: SalesAnalysis) => void;
  onMessages?: (data: Messages) => void;
  onError?: (stage: string, message: string) => void;
  onStageFailed?: (stage: string, retry: boolean) => void;
  onDone?: () => void;
};

export function createSSEConnection(taskId: string, callbacks: SSECallback): () => void {
  const url = `/api/analysis/${taskId}/stream`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener("search_complete", (e) => {
    callbacks.onSearchComplete?.(JSON.parse(e.data));
  });

  eventSource.addEventListener("company_analysis", (e) => {
    callbacks.onCompanyAnalysis?.(JSON.parse(e.data));
  });

  eventSource.addEventListener("sales_analysis", (e) => {
    callbacks.onSalesAnalysis?.(JSON.parse(e.data));
  });

  eventSource.addEventListener("messages", (e) => {
    callbacks.onMessages?.(JSON.parse(e.data));
  });

  eventSource.addEventListener("error", (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onError?.(data.stage, data.message);
    } catch {
      callbacks.onError?.("connection", "SSE连接错误");
    }
  });

  eventSource.addEventListener("stage_failed", (e) => {
    const data = JSON.parse(e.data);
    callbacks.onStageFailed?.(data.stage, data.retry);
  });

  eventSource.addEventListener("done", () => {
    callbacks.onDone?.();
    eventSource.close();
  });

  // Generic error handler
  eventSource.onerror = () => {
    callbacks.onError?.("connection", "SSE连接中断");
    eventSource.close();
  };

  return () => eventSource.close();
}
```

- [ ] **Step 4: Create SearchInput.tsx**

```typescript
// ai-customer-analysis/frontend/components/SearchInput.tsx
"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface Props {
  onAnalyze: (input: string) => void;
  disabled: boolean;
}

export default function SearchInput({ onAnalyze, disabled }: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onAnalyze(value.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="输入公司名称或官网，如：华为 或 https://www.huawei.com"
          className="flex-1 rounded-lg border px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          开始分析
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Create ProgressStage.tsx**

```typescript
// ai-customer-analysis/frontend/components/ProgressStage.tsx
"use client";

import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { StageStatus } from "@/lib/types";

interface Props {
  stages: StageStatus[];
}

const STAGE_LABELS: Record<string, string> = {
  search: "搜索企业信息",
  company_analysis: "企业分析",
  sales_analysis: "销售分析",
  messages: "生成开发信",
};

export default function ProgressStage({ stages }: Props) {
  return (
    <div className="space-y-2 rounded-lg border bg-white p-4">
      <p className="mb-3 text-sm font-medium text-muted-foreground">
        正在分析客户信息... 预计耗时15-30秒
      </p>
      {stages.map((s) => (
        <div key={s.stage} className="flex items-center gap-2 text-sm">
          {s.status === "running" && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          {s.status === "success" && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {s.status === "failed" && (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          {s.status === "pending" && (
            <div className="h-4 w-4 rounded-full border-2 border-gray-200" />
          )}
          <span className={s.status === "failed" ? "text-red-500" : ""}>
            {STAGE_LABELS[s.stage] || s.label}
            {s.status === "failed" && " — 失败"}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create app/page.tsx (analysis page)**

```typescript
// ai-customer-analysis/frontend/app/page.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import SearchInput from "@/components/SearchInput";
import ProgressStage from "@/components/ProgressStage";
import ExecutiveSummaryCard from "@/components/ExecutiveSummaryCard";
import ConfidenceCard from "@/components/ConfidenceCard";
import ScoreCard from "@/components/ScoreCard";
import CompanyProfileCard from "@/components/CompanyProfileCard";
import SignalCard from "@/components/SignalCard";
import NeedsCard from "@/components/NeedsCard";
import EntryPointsCard from "@/components/EntryPointsCard";
import ContactStrategyCard from "@/components/ContactStrategyCard";
import NextActionsCard from "@/components/NextActionsCard";
import MessageCard from "@/components/MessageCard";
import CopyFullReport from "@/components/CopyFullReport";
import { createSSEConnection } from "@/lib/sse-client";
import { incrementAnalysisCount, canAnalyze } from "@/lib/storage";
import type {
  CompanyContext,
  CompanyAnalysis,
  SalesAnalysis,
  Messages,
  StageStatus,
} from "@/lib/types";

const INITIAL_STAGES: StageStatus[] = [
  { stage: "search", label: "搜索企业信息", status: "pending" },
  { stage: "company_analysis", label: "企业分析", status: "pending" },
  { stage: "sales_analysis", label: "销售分析", status: "pending" },
  { stage: "messages", label: "生成开发信", status: "pending" },
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<StageStatus[]>(INITIAL_STAGES);
  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null);
  const [companyAnalysis, setCompanyAnalysis] = useState<CompanyAnalysis | null>(null);
  const [salesAnalysis, setSalesAnalysis] = useState<SalesAnalysis | null>(null);
  const [messages, setMessages] = useState<Messages | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const closeRef = useRef<(() => void) | null>(null);

  const updateStage = (stage: string, status: "running" | "success" | "failed") => {
    setStages((prev) =>
      prev.map((s) => (s.stage === stage ? { ...s, status } : s))
    );
  };

  const handleAnalyze = useCallback(async (input: string) => {
    if (!canAnalyze()) {
      setError("今日免费分析次数已用完（3次/天）。请输入邮箱获取额外10次。");
      return;
    }

    setLoading(true);
    setError(null);
    setCompanyContext(null);
    setCompanyAnalysis(null);
    setSalesAnalysis(null);
    setMessages(null);
    setGeneratedAt(null);
    setStages(INITIAL_STAGES.map((s) => ({ ...s })));

    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "创建分析任务失败");
      }
      const { task_id } = await res.json();
      setTaskId(task_id);
      window.location.hash = `task=${task_id}`;
      incrementAnalysisCount();

      closeRef.current = createSSEConnection(task_id, {
        onSearchComplete: (data) => {
          setCompanyContext(data);
          updateStage("search", "success");
          updateStage("company_analysis", "running");
        },
        onCompanyAnalysis: (data) => {
          setCompanyAnalysis(data);
          updateStage("company_analysis", "success");
          updateStage("sales_analysis", "running");
        },
        onSalesAnalysis: (data) => {
          setSalesAnalysis(data);
          updateStage("sales_analysis", "success");
          updateStage("messages", "running");
        },
        onMessages: (data) => {
          setMessages(data);
          updateStage("messages", "success");
          setGeneratedAt(new Date().toISOString());
        },
        onError: (stage, message) => {
          if (stage !== "connection") updateStage(stage, "failed");
          setError(message);
        },
        onStageFailed: (stage) => {
          updateStage(stage, "failed");
        },
        onDone: () => {
          setLoading(false);
        },
      });
    } catch (e: any) {
      setError(e.message || "分析失败");
      setLoading(false);
    }
  }, []);

  const handleReanalyze = () => {
    if (taskId) {
      handleAnalyze(
        companyContext?.company_name || ""
      );
    }
  };

  const isComplete = companyAnalysis !== null || salesAnalysis !== null;

  return (
    <div className="space-y-6">
      <section className="text-center">
        <h1 className="mb-2 text-2xl font-bold">AI客户分析助手</h1>
        <p className="mb-6 text-muted-foreground">
          输入客户公司名称或官网，30秒生成客户画像、潜在需求和销售切入策略
        </p>
        <SearchInput onAnalyze={handleAnalyze} disabled={loading} />
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </section>

      {loading && <ProgressStage stages={stages} />}

      {isComplete && (
        <>
          {/* Meta bar */}
          <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              {generatedAt && (
                <span>分析时间：{new Date(generatedAt).toLocaleString("zh-CN")}</span>
              )}
              {companyContext?.data_confidence && (
                <span>
                  数据完整度：{companyContext.data_confidence.score}% · {companyContext.data_confidence.level}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReanalyze}
                className="rounded-md border px-3 py-1 text-xs hover:bg-gray-50"
              >
                重新分析
              </button>
              <CopyFullReport
                companyName={companyContext?.company_name}
                generatedAt={generatedAt}
                companyContext={companyContext}
                companyAnalysis={companyAnalysis}
                salesAnalysis={salesAnalysis}
                messages={messages}
              />
            </div>
          </div>

          {salesAnalysis?.executive_summary && (
            <ExecutiveSummaryCard data={salesAnalysis.executive_summary} />
          )}
          {companyContext?.data_confidence && (
            <ConfidenceCard data={companyContext.data_confidence} />
          )}
          {salesAnalysis?.customer_score && (
            <ScoreCard data={salesAnalysis.customer_score} />
          )}
          {companyAnalysis?.company_profile && (
            <CompanyProfileCard data={companyAnalysis.company_profile} />
          )}
          {companyAnalysis?.signals && companyAnalysis.signals.length > 0 && (
            <SignalCard signals={companyAnalysis.signals} />
          )}
          {salesAnalysis?.potential_needs && salesAnalysis.potential_needs.length > 0 && (
            <NeedsCard needs={salesAnalysis.potential_needs} />
          )}
          {salesAnalysis?.sales_entry_points && salesAnalysis.sales_entry_points.length > 0 && (
            <EntryPointsCard entryPoints={salesAnalysis.sales_entry_points} />
          )}
          {salesAnalysis?.contact_strategy && (
            <ContactStrategyCard data={salesAnalysis.contact_strategy} />
          )}
          {salesAnalysis?.next_actions && salesAnalysis.next_actions.length > 0 && (
            <NextActionsCard actions={salesAnalysis.next_actions} />
          )}
          {messages && <MessageCard messages={messages} />}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: analysis page with SSE-driven progressive rendering"
```

---

### Task 13: Frontend - All 10 display card components

**Files:**
- Create: `ai-customer-analysis/frontend/components/ExecutiveSummaryCard.tsx`
- Create: `ai-customer-analysis/frontend/components/ConfidenceCard.tsx`
- Create: `ai-customer-analysis/frontend/components/ScoreCard.tsx`
- Create: `ai-customer-analysis/frontend/components/CompanyProfileCard.tsx`
- Create: `ai-customer-analysis/frontend/components/SignalCard.tsx`
- Create: `ai-customer-analysis/frontend/components/NeedsCard.tsx`
- Create: `ai-customer-analysis/frontend/components/EntryPointsCard.tsx`
- Create: `ai-customer-analysis/frontend/components/ContactStrategyCard.tsx`
- Create: `ai-customer-analysis/frontend/components/NextActionsCard.tsx`
- Create: `ai-customer-analysis/frontend/components/MessageCard.tsx`
- Create: `ai-customer-analysis/frontend/components/CopyButton.tsx`
- Create: `ai-customer-analysis/frontend/components/CopyFullReport.tsx`

**Interfaces:**
- Each card consumes its specific data type from `lib/types.ts`
- Each card renders a bordered card with content

- [ ] **Step 1: Create ExecutiveSummaryCard.tsx**

```typescript
// ai-customer-analysis/frontend/components/ExecutiveSummaryCard.tsx
"use client";

import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import type { ExecutiveSummary } from "@/lib/types";

const VERDICT_ICON = {
  recommended: CheckCircle,
  cautious: AlertTriangle,
  not_recommended: XCircle,
} as const;

const VERDICT_COLOR = {
  recommended: "text-green-600",
  cautious: "text-yellow-600",
  not_recommended: "text-red-600",
} as const;

interface Props {
  data: ExecutiveSummary;
}

export default function ExecutiveSummaryCard({ data }: Props) {
  const Icon = VERDICT_ICON[data.verdict] || CheckCircle;
  const colorClass = VERDICT_COLOR[data.verdict] || "text-green-600";

  return (
    <div className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-white p-6">
      <h2 className="mb-4 text-lg font-bold">AI销售建议</h2>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-6 w-6 ${colorClass}`} />
        <span className={`text-xl font-bold ${colorClass}`}>{data.verdict_text}</span>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        客户价值：<span className="font-semibold text-foreground">{data.customer_value}</span>
      </p>
      <div className="mb-3">
        <p className="mb-1 text-sm font-medium">推荐理由：</p>
        <ul className="space-y-1">
          {data.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1 text-green-500">✓</span>
              {r}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-muted-foreground">
        建议联系：{data.suggested_contacts.join("、")}
      </p>
      <p className="text-sm text-muted-foreground">推荐时机：{data.best_timing}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create ConfidenceCard.tsx**

```typescript
// ai-customer-analysis/frontend/components/ConfidenceCard.tsx
"use client";

import type { DataConfidence } from "@/lib/types";

const LEVEL_COLOR = {
  "高": "bg-green-100 text-green-700",
  "中": "bg-yellow-100 text-yellow-700",
  "低": "bg-red-100 text-red-700",
};

interface Props {
  data: DataConfidence;
}

export default function ConfidenceCard({ data }: Props) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">数据完整度</h3>
      <div className="mb-2 flex items-center gap-3">
        <div className="text-2xl font-bold">{data.score}%</div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLOR[data.level] || ""}`}>
          {data.level}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{data.detail}</p>
    </div>
  );
}
```

- [ ] **Step 3: Create ScoreCard.tsx**

```typescript
// ai-customer-analysis/frontend/components/ScoreCard.tsx
"use client";

import type { CustomerScore } from "@/lib/types";

interface Props {
  data: CustomerScore;
}

export default function ScoreCard({ data }: Props) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">客户价值评分</h3>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-primary">{data.score}分</span>
        <span className="text-lg text-muted-foreground">{data.level}级客户</span>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">{data.reason}</p>
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">评分依据</p>
        <ul className="space-y-1">
          {data.factors.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-1 text-green-500">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create CompanyProfileCard.tsx**

```typescript
// ai-customer-analysis/frontend/components/CompanyProfileCard.tsx
"use client";

import type { CompanyProfile } from "@/lib/types";
import { Building2, Users, TrendingUp, Briefcase } from "lucide-react";

interface Props {
  data: CompanyProfile;
}

const ITEMS = [
  { key: "industry", label: "行业", icon: Building2 },
  { key: "scale", label: "规模", icon: Users },
  { key: "stage", label: "发展阶段", icon: TrendingUp },
  { key: "main_business", label: "主营业务", icon: Briefcase },
] as const;

export default function CompanyProfileCard({ data }: Props) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">企业画像</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ITEMS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-start gap-2">
            <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm">{(data as any)[key] || "—"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create SignalCard.tsx**

```typescript
// ai-customer-analysis/frontend/components/SignalCard.tsx"
"use client";

import type { Signal } from "@/lib/types";
import { TrendingUp, ExternalLink } from "lucide-react";

interface Props {
  signals: Signal[];
}

export default function SignalCard({ signals }: Props) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">企业信号</h3>
      <div className="space-y-4">
        {signals.map((s, i) => (
          <div key={i} className="border-b pb-3 last:border-b-0 last:pb-0">
            <div className="mb-1 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-medium">{s.signal}</span>
            </div>
            <p className="mb-1 text-sm text-muted-foreground">原因：{s.reason}</p>
            <p className="mb-1 text-sm text-muted-foreground">证据：{s.evidence}</p>
            {s.source && (
              <a
                href={s.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                来源
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create NeedsCard.tsx**

```typescript
// ai-customer-analysis/frontend/components/NeedsCard.tsx
"use client";

import type { PotentialNeed } from "@/lib/types";

const PRIORITY_COLOR: Record<string, string> = {
  "高": "bg-red-100 text-red-700",
  "中": "bg-yellow-100 text-yellow-700",
  "低": "bg-gray-100 text-gray-700",
};

interface Props {
  needs: PotentialNeed[];
}

export default function NeedsCard({ needs }: Props) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">潜在需求</h3>
      <div className="space-y-4">
        {needs.map((n, i) => (
          <div key={i} className="border-b pb-3 last:border-b-0 last:pb-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-medium">{n.need}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY_COLOR[n.priority] || ""}`}>
                {n.priority}优先级
              </span>
            </div>
            <p className="mb-1 text-sm text-muted-foreground">判断依据：{n.reason}</p>
            <p className="text-sm text-muted-foreground">证据：{n.evidence}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create EntryPointsCard.tsx**

```typescript
// ai-customer-analysis/frontend/components/EntryPointsCard.tsx
"use client";

import type { SalesEntryPoint } from "@/lib/types";

interface Props {
  entryPoints: SalesEntryPoint[];
}

export default function EntryPointsCard({ entryPoints }: Props) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">销售切入点</h3>
      <div className="space-y-4">
        {entryPoints.map((ep, i) => (
          <div key={i} className="border-b pb-3 last:border-b-0 last:pb-0">
            <p className="mb-1 font-medium">{ep.direction}</p>
            <p className="mb-1 text-sm text-muted-foreground">原因：{ep.reason}</p>
            <p className="mb-2 text-sm text-muted-foreground">证据：{ep.evidence}</p>
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">建议话术</p>
              <p className="text-sm italic">{ep.suggested_talk}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Create ContactStrategyCard.tsx**

```typescript
// ai-customer-analysis/frontend/components/ContactStrategyCard.tsx
"use client";

import type { ContactStrategy } from "@/lib/types";

interface Props {
  data: ContactStrategy;
}

export default function ContactStrategyCard({ data }: Props) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">首次联系建议</h3>
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">最佳切入话题：</span>
          {data.best_topic}
        </p>
        <p className="text-xs text-muted-foreground">原因：{data.reason}</p>
        <p>
          <span className="text-muted-foreground">避免话题：</span>
          {data.avoid_topics.join("、")}
        </p>
        <p>
          <span className="text-muted-foreground">推荐渠道：</span>
          {data.recommended_channel}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Create NextActionsCard.tsx**

```typescript
// ai-customer-analysis/frontend/components/NextActionsCard.tsx
"use client";

import type { NextAction } from "@/lib/types";
import { ExternalLink } from "lucide-react";

interface Props {
  actions: NextAction[];
}

export default function NextActionsCard({ actions }: Props) {
  const totalTime = actions.reduce((acc, a) => {
    const mins = parseInt(a.estimated_time) || 0;
    return acc + mins;
  }, 0);

  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">下一步行动</h3>
      <div className="space-y-3">
        {actions.map((a) => (
          <div key={a.step} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {a.step}
            </span>
            <div className="flex-1">
              <p className="text-sm">{a.action}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">预计耗时：{a.estimated_time}</span>
                {a.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    前往
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">
        总耗时：约{totalTime}分钟
      </p>
    </div>
  );
}
```

- [ ] **Step 10: Create MessageCard.tsx + CopyButton.tsx**

```typescript
// ai-customer-analysis/frontend/components/CopyButton.tsx
"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  text: string;
  label?: string;
}

export default function CopyButton({ text, label = "复制" }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "已复制" : label}
    </button>
  );
}
```

```typescript
// ai-customer-analysis/frontend/components/MessageCard.tsx
"use client";

import type { Messages } from "@/lib/types";
import CopyButton from "./CopyButton";
import { Mail, Linkedin, MessageCircle } from "lucide-react";

interface Props {
  messages: Messages;
}

export default function MessageCard({ messages }: Props) {
  const channels = [
    { key: "email_message", label: "邮件版", icon: Mail, data: messages.email_message },
    { key: "linkedin_message", label: "LinkedIn版", icon: Linkedin, data: messages.linkedin_message },
    { key: "wechat_message", label: "微信版", icon: MessageCircle, data: messages.wechat_message },
  ];

  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">开发信</h3>
      <div className="space-y-4">
        {channels.map((ch) => (
          <div key={ch.key}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ch.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{ch.label}</span>
              </div>
              <CopyButton text={ch.data} />
            </div>
            <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
              {ch.data || "生成失败"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Create CopyFullReport.tsx**

```typescript
// ai-customer-analysis/frontend/components/CopyFullReport.tsx
"use client";

import { Copy } from "lucide-react";
import type { CompanyContext, CompanyAnalysis, SalesAnalysis, Messages } from "@/lib/types";

interface Props {
  companyName?: string;
  generatedAt: string | null;
  companyContext: CompanyContext | null;
  companyAnalysis: CompanyAnalysis | null;
  salesAnalysis: SalesAnalysis | null;
  messages: Messages | null;
}

export default function CopyFullReport(props: Props) {
  const buildReportText = (): string => {
    const lines: string[] = [];
    const { companyName, generatedAt, companyContext, companyAnalysis, salesAnalysis, messages } = props;

    lines.push("━━━ AI客户分析报告 ━━━");
    lines.push("");
    lines.push(`公司：${companyName || "—"}`);
    lines.push(`分析时间：${generatedAt ? new Date(generatedAt).toLocaleString("zh-CN") : "—"}`);
    if (companyContext?.data_confidence) {
      lines.push(`数据完整度：${companyContext.data_confidence.score}% · ${companyContext.data_confidence.level}`);
    }
    lines.push("");

    if (salesAnalysis?.executive_summary) {
      const es = salesAnalysis.executive_summary;
      lines.push("━━━ AI销售建议 ━━━");
      lines.push(`${es.verdict_text} · 客户价值：${es.customer_value}`);
      lines.push("");
      lines.push("推荐理由：");
      es.reasons.forEach((r) => lines.push(`✓ ${r}`));
      lines.push("");
      lines.push(`建议联系：${es.suggested_contacts.join("、")}`);
      lines.push(`推荐时机：${es.best_timing}`);
      lines.push("");
    }

    if (salesAnalysis?.customer_score) {
      const cs = salesAnalysis.customer_score;
      lines.push("━━━ 客户评分 ━━━");
      lines.push(`${cs.score}分 · ${cs.level}级客户`);
      lines.push(cs.reason);
      lines.push("");
      lines.push("评分依据：");
      cs.factors.forEach((f) => lines.push(`✓ ${f}`));
      lines.push("");
    }

    if (companyAnalysis?.company_profile) {
      const cp = companyAnalysis.company_profile;
      lines.push("━━━ 企业画像 ━━━");
      lines.push(`行业：${cp.industry}`);
      lines.push(`规模：${cp.scale}`);
      lines.push(`阶段：${cp.stage}`);
      lines.push(`主营业务：${cp.main_business}`);
      lines.push("");
    }

    if (companyAnalysis?.signals) {
      lines.push("━━━ 企业信号 ━━━");
      companyAnalysis.signals.forEach((s) => {
        lines.push(`• ${s.signal}`);
        lines.push(`  证据：${s.evidence}`);
      });
      lines.push("");
    }

    if (salesAnalysis?.potential_needs) {
      lines.push("━━━ 潜在需求 ━━━");
      salesAnalysis.potential_needs.forEach((n) => {
        lines.push(`• [${n.priority}] ${n.need}`);
        lines.push(`  依据：${n.reason}`);
      });
      lines.push("");
    }

    if (salesAnalysis?.sales_entry_points) {
      lines.push("━━━ 销售切入点 ━━━");
      salesAnalysis.sales_entry_points.forEach((ep) => {
        lines.push(`• ${ep.direction}`);
        lines.push(`  话术：${ep.suggested_talk}`);
      });
      lines.push("");
    }

    if (salesAnalysis?.contact_strategy) {
      const st = salesAnalysis.contact_strategy;
      lines.push("━━━ 联系建议 ━━━");
      lines.push(`话题：${st.best_topic}`);
      lines.push(`渠道：${st.recommended_channel}`);
      lines.push(`避免：${st.avoid_topics.join("、")}`);
      lines.push("");
    }

    if (messages) {
      lines.push("━━━ 开发信 ━━━");
      if (messages.email_message) {
        lines.push("【邮件版】");
        lines.push(messages.email_message);
        lines.push("");
      }
      if (messages.wechat_message) {
        lines.push("【微信版】");
        lines.push(messages.wechat_message);
        lines.push("");
      }
    }

    return lines.join("\n");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildReportText());
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs hover:bg-gray-50"
    >
      <Copy className="h-3 w-3" />
      复制完整报告
    </button>
  );
}
```

- [ ] **Step 12: Commit**

```bash
git add frontend/components/
git commit -m "feat: all 10 display cards + copy functionality"
```

---

### Task 14: History and Account pages

**Files:**
- Create: `ai-customer-analysis/frontend/app/history/page.tsx`
- Create: `ai-customer-analysis/frontend/app/account/page.tsx`

- [ ] **Step 1: Create history page**

```typescript
// ai-customer-analysis/frontend/app/history/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, RefreshCw } from "lucide-react";

interface HistoryItem {
  task_id: string;
  company_name: string;
  status: string;
  generated_at: string | null;
  created_at: string | null;
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => setItems(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleReanalyze = async (item: HistoryItem) => {
    // Navigate to home page with pre-filled input
    router.push(`/?reanalyze=${item.task_id}`);
  };

  if (loading) {
    return <p className="text-center text-muted-foreground">加载中...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">暂无分析记录</p>
        <a href="/" className="mt-2 inline-block text-sm text-primary hover:underline">
          开始第一次分析 →
        </a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">历史记录</h1>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.task_id}
            className="flex items-center justify-between rounded-lg border bg-white p-4"
          >
            <div>
              <p className="font-medium">{item.company_name}</p>
              <p className="text-xs text-muted-foreground">
                {item.generated_at
                  ? new Date(item.generated_at).toLocaleString("zh-CN")
                  : new Date(item.created_at || "").toLocaleString("zh-CN")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/?task=${item.task_id}`)}
                className="rounded-md border px-3 py-1 text-xs hover:bg-gray-50"
              >
                查看
              </button>
              <button
                onClick={() => handleReanalyze(item)}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs hover:bg-gray-50"
              >
                <RefreshCw className="h-3 w-3" />
                重新分析
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create account page**

```typescript
// ai-customer-analysis/frontend/app/account/page.tsx
"use client";

import { useState, useEffect } from "react";
import { getTodayAnalysisCount, getBonusRemaining, getStoredEmail } from "@/lib/storage";

export default function AccountPage() {
  const [todayCount, setTodayCount] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setTodayCount(getTodayAnalysisCount());
    setBonus(getBonusRemaining());
    setEmail(getStoredEmail());
  }, []);

  const totalRemaining = Math.max(0, 3 - todayCount) + bonus;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">账户中心</h1>
      <div className="space-y-4">
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-3 text-sm font-semibold">当前套餐</h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium">免费版</span>
            <span className="text-sm text-muted-foreground">每天 3 次免费分析</span>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-3 text-sm font-semibold">今日剩余</h3>
          <p className="text-2xl font-bold text-primary">{totalRemaining} 次</p>
          <p className="text-xs text-muted-foreground">
            今日已用 {todayCount} 次 · 奖励剩余 {bonus} 次
          </p>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-3 text-sm font-semibold">邮箱</h3>
          {email ? (
            <p className="text-sm">{email}</p>
          ) : (
            <p className="text-sm text-muted-foreground">未填写邮箱</p>
          )}
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-3 text-sm font-semibold">升级会员</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border p-4">
              <p className="font-semibold">Pro 版</p>
              <p className="text-2xl font-bold">¥99<span className="text-sm font-normal text-muted-foreground">/月</span></p>
              <p className="text-sm text-muted-foreground">100 次分析 / 月</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="font-semibold">Team 版</p>
              <p className="text-2xl font-bold">¥299<span className="text-sm font-normal text-muted-foreground">/月</span></p>
              <p className="text-sm text-muted-foreground">500 次分析 / 月</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">如需升级，请联系客服。支付系统将在后续版本上线。</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/history/ frontend/app/account/
git commit -m "feat: history and account pages"
```

---

### Task 15: Docker Compose production setup + final integration

**Files:**
- Create: `ai-customer-analysis/docker-compose.yml`
- Modify: `ai-customer-analysis/backend/app/main.py` (add lifespan import adjustments)
- Modify: `ai-customer-analysis/frontend/app/page.tsx` (integrate URL hash restoration)

- [ ] **Step 1: Integrate page refresh recovery in page.tsx**

Add to `page.tsx` after the `handleAnalyze` function:

```typescript
// Add this useEffect to restore task from URL hash
useEffect(() => {
  const hash = window.location.hash;
  if (hash.startsWith("#task=")) {
    const tid = hash.replace("#task=", "");
    setTaskId(tid);
    // Fetch existing task state
    fetch(`/api/analysis/${tid}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "success" || data.status === "partial_success") {
          if (data.company_context) {
            setCompanyContext(data.company_context);
            updateStageFromData("search", "success");
          }
          if (data.company_analysis) {
            setCompanyAnalysis(data.company_analysis);
            updateStageFromData("company_analysis", "success");
          }
          if (data.sales_analysis) {
            setSalesAnalysis(data.sales_analysis);
            updateStageFromData("sales_analysis", "success");
          }
          if (data.messages) {
            setMessages(data.messages);
            updateStageFromData("messages", "success");
          }
          setGeneratedAt(data.generated_at);
        }
      })
      .catch(console.error);
  }
}, []);

function updateStageFromData(stage: string, status: "success") {
  setStages((prev) => prev.map((s) => (s.stage === stage ? { ...s, status } : s)));
}
```

- [ ] **Step 2: Create production docker-compose.yml**

```yaml
# ai-customer-analysis/docker-compose.yml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-customer_analysis}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-change-me-in-production}
      POSTGRES_DB: ${DB_NAME:-customer_analysis}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql+asyncpg://${DB_USER:-customer_analysis}:${DB_PASSWORD:-change-me-in-production}@db:5432/${DB_NAME:-customer_analysis}
      LLM_PROVIDER: ${LLM_PROVIDER:-deepseek}
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      DEEPSEEK_BASE_URL: ${DEEPSEEK_BASE_URL:-https://api.deepseek.com/v1}
      DEEPSEEK_MODEL: ${DEEPSEEK_MODEL:-deepseek-chat}
      SERPAPI_API_KEY: ${SERPAPI_API_KEY}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:3000}
    ports:
      - "8000:8000"
    depends_on:
      - db
    restart: unless-stopped

volumes:
  pgdata:
```

- [ ] **Step 3: Create backend Dockerfile**

```dockerfile
# ai-customer-analysis/backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 4: Full integration test**

```bash
# Start backend
cd ai-customer-analysis/backend && uvicorn app.main:app --port 8000 &
# Start frontend
cd ai-customer-analysis/frontend && npm run dev &

# Test the full flow
curl -X POST http://localhost:8000/api/analysis \
  -H "Content-Type: application/json" \
  -d '{"input": "华为"}'
```

Expected: Returns `{"task_id": "..."}` with a UUID.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: production docker setup, refresh recovery, integration test"
```

---

## Implementation Order

Tasks are listed in dependency order. Must execute sequentially within each phase:

1. **Phase 1 (Foundation):** Tasks 1 → 2 → 3 → 4 → 5
2. **Phase 2 (Backend):** Tasks 6 → 7 → 8 → 9 → 10
3. **Phase 3 (Frontend):** Tasks 11 → 12 → 13 → 14
4. **Phase 4 (Integration):** Task 15

After Task 9, the backend is fully testable via curl/HTTPie. After Task 13, the full UI is functional.
