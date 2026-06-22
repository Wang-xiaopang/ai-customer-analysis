# AI客户分析助手 MVP 设计文档

> 版本: V1.0  
> 日期: 2026-06-22  
> 状态: 已确认

---

## 一、产品概述

### 一句话描述

输入客户公司名称或官网，30秒生成客户画像、潜在需求和销售切入策略。

### 核心价值

帮助销售将原本20~30分钟的客户调研缩短到30秒以内。

### 目标用户

B2B销售、SaaS销售、软件销售、企业服务销售、外贸销售、招聘顾问、商务拓展（BD）

### MVP目标

验证"销售愿意为客户分析结果付费"。上线30天内：获得10个真实用户、完成100次分析、获得第1个付费用户。

---

## 二、技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 前端框架 | Next.js 15 (App Router) | SSR/SSG支持，Vercel部署 |
| UI组件 | Shadcn/ui + Tailwind CSS | 轻量、现代、与Next.js配合好 |
| 后端框架 | FastAPI | 原生SSE支持、异步、类型安全 |
| 数据库 | PostgreSQL | 可靠、生态成熟 |
| 实时通信 | SSE | 单向推送，比WebSocket轻量 |
| LLM | DeepSeek (Provider抽象层) | 中文好、便宜、OpenAI兼容 |
| 搜索 | SerpAPI | 结构化搜索结果 |
| 部署 | Frontend: Vercel / Backend: Railway | V1最简单的部署方案 |
| 仓库 | Monorepo | frontend/ + backend/ 单仓库 |

---

## 三、项目结构

```
ai-customer-analysis/
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # /         分析首页
│   │   ├── history/page.tsx      # /history  历史记录
│   │   ├── account/page.tsx      # /account  账户中心
│   │   └── layout.tsx            # 根布局（Header etc.）
│   ├── components/
│   │   ├── SearchInput.tsx            # 输入组件（公司名/URL/简介）
│   │   ├── ExecutiveSummaryCard.tsx   # AI销售建议（★最高优先级）
│   │   ├── ConfidenceCard.tsx         # 数据完整度
│   │   ├── ScoreCard.tsx              # 客户价值评分
│   │   ├── CompanyProfileCard.tsx     # 企业画像
│   │   ├── SignalCard.tsx             # 企业信号
│   │   ├── NeedsCard.tsx              # 潜在需求
│   │   ├── EntryPointsCard.tsx        # 销售切入点
│   │   ├── ContactStrategyCard.tsx    # 首次联系建议
│   │   ├── NextActionsCard.tsx        # 下一步行动
│   │   ├── MessageCard.tsx            # 开发信
│   │   ├── ProgressStage.tsx          # 三阶段进度指示器
│   │   ├── CopyButton.tsx             # 复制按钮
│   │   ├── CopyFullReport.tsx         # 一键复制完整报告
│   │   └── ui/                        # shadcn/ui 组件
│   └── lib/
│       ├── sse-client.ts         # SSE 客户端封装
│       └── storage.ts            # localStorage 封装（游客次数）
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI 入口
│   │   ├── routers/
│   │   │   ├── analysis.py       # POST /api/analysis, GET /api/analysis/{id}/stream
│   │   │   ├── history.py        # GET /api/history, GET /api/history/{id}
│   │   │   └── account.py        # GET /api/account
│   │   ├── services/
│   │   │   └── analysis/
│   │   │       ├── search_service.py    # 搜索引擎 + 企业信息API
│   │   │       ├── company_analyzer.py  # 阶段2：企业分析
│   │   │       ├── sales_analyzer.py    # 阶段3：销售分析
│   │   │       ├── message_generator.py # 阶段4：开发信生成
│   │   │       └── orchestrator.py      # 四阶段编排
│   │   ├── llm/
│   │   │   ├── base.py           # LLM 抽象基类
│   │   │   ├── deepseek.py       # DeepSeek 实现
│   │   │   ├── openai.py         # OpenAI 实现（备用）
│   │   │   └── factory.py        # 工厂函数，根据配置返回 Provider
│   │   ├── prompts/
│   │   │   ├── company_analysis.txt    # 阶段2 Prompt
│   │   │   ├── sales_analysis.txt      # 阶段3 Prompt
│   │   │   └── outreach_generation.txt  # 阶段4 Prompt
│   │   ├── models/
│   │   │   ├── user.py           # 用户模型
│   │   │   ├── analysis_task.py  # 分析任务模型
│   │   │   └── report.py         # 报告模型
│   │   ├── schemas/              # Pydantic 请求/响应 Schema
│   │   └── middleware/
│   │       └── rate_limit.py     # 游客次数限制中间件
│   └── requirements.txt
├── docs/
│   ├── PRD.md
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── PROMPTS.md
│   └── 2026-06-22-ai-customer-analysis-design.md  # 本文件
└── docker-compose.dev.yml
```

---

## 四、分析架构

### 核心设计

**共享上下文 + 四阶段串行分析**。企业信息只搜索一次，结构化缓存，所有分析模块共享同一上下文。

### 数据流

```
用户输入（公司名/URL/简介）
         │
         ▼
   ┌─────────────┐
   │ 阶段1: 搜索  │  SerpAPI 搜索 + 网页抓取
   │ 输出:        │  company_context (JSON)
   │ company_     │  含 data_confidence 数据完整度评分
   │ context      │
   └──────┬───────┘
          │ SSE: search_complete
          ▼
   ┌─────────────┐
   │ 阶段2: 企业  │  LLM 分析
   │ 分析         │  Prompt: company_analysis.txt
   │ 输出:        │  输入: company_context
   │ company_     │  输出: company_profile + signals +
   │ analysis     │        recent_updates + risks
   └──────┬───────┘
          │ SSE: company_analysis
          ▼
   ┌─────────────┐
   │ 阶段3: 销售  │  LLM 分析
   │ 分析         │  Prompt: sales_analysis.txt
   │ 输出:        │  输入: company_context + company_analysis
   │ sales_       │  输出: customer_score + potential_needs +
   │ analysis     │        sales_entry_points + contact_strategy
   └──────┬───────┘
          │ SSE: sales_analysis
          ▼
   ┌─────────────┐
   │ 阶段4: 开发  │  LLM 生成
   │ 信生成       │  Prompt: outreach_generation.txt
   │ 输出:        │  输入: company_context + company_analysis
   │ messages     │        + sales_analysis
   │              │  输出: email + linkedin + wechat messages
   └──────┬───────┘
          │ SSE: messages
          ▼
   ┌─────────────┐
   │ 保存结果     │  写入 PostgreSQL
   │ 输出:        │  SSE: done
   │ done         │
   └─────────────┘
```

### 各阶段输出数据结构

**阶段1 - company_context:**

搜索完成后立即计算数据完整度评分，后续所有分析阶段共享此评分。

```json
{
  "company_name": "华为技术有限公司",
  "website": "https://www.huawei.com",
  "industry": "信息与通信技术",
  "website_content": "...",
  "news": [
    {"title": "...", "url": "...", "snippet": "...", "date": "..."}
  ],
  "data_confidence": {
    "score": 85,
    "level": "高",
    "detail": "获取到官网、10条新闻、招聘信息，数据充足"
  }
}
```

**data_confidence 计算规则（后端实现）：**

| 数据来源 | 权重 | 说明 |
|---------|------|------|
| 有官网内容 | +30 | 官网可访问且有文字内容 |
| 有新闻结果 | +25 | ≥3条新闻 |
| 有招聘信息 | +20 | SerpAPI搜到招聘页面 |
| 有LinkedIn | +15 | LinkedIn公司页面 |
| 有明确行业 | +10 | 可识别行业分类 |

- **高 (80-100)**: 数据充足，分析可信
- **中 (50-79)**: 部分数据，分析仅供参考
- **低 (0-49)**: 信息很少，分析推测成分大

**阶段2 - company_analysis:**

每个结论必须遵循 C-R-E 原则：**结论 → 原因 → 证据来源**。

```json
{
  "company_profile": {
    "industry": "信息与通信技术",
    "scale": "超大型企业（10万+员工）",
    "stage": "成熟期，持续扩张",
    "main_business": "ICT基础设施、智能终端、云服务"
  },
  "signals": [
    {
      "signal": "企业正在扩张",
      "reason": "官网招聘页面显示大量新增岗位",
      "evidence": "官网招聘页面显示新增10个销售岗位",
      "source": "https://company.com/careers"
    }
  ],
  "recent_updates": [
    {
      "title": "发布新产品线",
      "description": "...",
      "evidence": "...",
      "source": "https://..."
    }
  ],
  "risks": [
    {
      "risk": "行业竞争加剧",
      "reason": "...",
      "evidence": "...",
      "source": "https://..."
    }
  ]
}
```

**阶段3 - sales_analysis:**

同样遵循 C-R-E 原则。所有推论必须基于阶段2的事实证据链。

```json
{
  "customer_score": {
    "score": 86,
    "level": "A",
    "reason": "企业处于扩张阶段，销售价值较高",
    "factors": [
      "近期招聘销售岗位",
      "新增产品线",
      "正在拓展海外市场"
    ]
  },
  "potential_needs": [
    {
      "need": "CRM管理系统",
      "priority": "高",
      "reason": "销售团队正在快速扩张，需要系统化管理客户",
      "evidence": "官网招聘页面显示新增10个销售岗位"
    }
  ],
  "sales_entry_points": [
    {
      "direction": "CRM建设",
      "reason": "销售团队扩张后需要客户管理工具",
      "evidence": "近期招聘销售岗位",
      "suggested_talk": "了解到贵司近期在扩建销售团队..."
    }
  ],
  "contact_strategy": {
    "best_topic": "从招聘扩张聊到销售管理挑战",
    "reason": "企业正在扩张，天然话题切入点",
    "avoid_topics": ["直接询问预算", "贬低现有方案"],
    "recommended_channel": "LinkedIn + 邮件双渠道"
  },
  "executive_summary": {
    "verdict": "recommended",
    "verdict_text": "推荐跟进",
    "customer_value": "高",
    "reasons": [
      "企业正在扩张",
      "新增销售岗位",
      "正在布局海外市场"
    ],
    "suggested_contacts": ["市场负责人", "销售负责人"],
    "best_timing": "未来30天"
  },
  "next_actions": [
    {
      "step": 1,
      "action": "查看官网招聘页，了解具体招聘岗位和团队规模",
      "url": "https://company.com/careers",
      "estimated_time": "3分钟"
    },
    {
      "step": 2,
      "action": "在LinkedIn上找到销售负责人并了解其背景",
      "url": null,
      "estimated_time": "5分钟"
    },
    {
      "step": 3,
      "action": "发送开发信（邮件+LinkedIn双渠道）",
      "url": null,
      "estimated_time": "2分钟"
    }
  ]
}
```

**阶段4 - messages:**
```json
{
  "email_message": "",
  "linkedin_message": "",
  "wechat_message": ""
}
```

---

## 五、前端展示模块映射与可信度设计

### 展示模块（按页面顺序从上到下）

| 顺序 | 展示模块 | 数据来源 | 卡片组件 |
|------|---------|---------|---------|
| 1 | AI销售建议 ★ | sales_analysis.executive_summary | ExecutiveSummaryCard |
| 2 | 数据完整度 | company_context.data_confidence | ConfidenceCard |
| 3 | 客户价值评分 | sales_analysis.customer_score | ScoreCard |
| 4 | 企业画像 | company_analysis.company_profile | CompanyProfileCard |
| 5 | 企业信号 | company_analysis.signals | SignalCard |
| 6 | 潜在需求 | sales_analysis.potential_needs | NeedsCard |
| 7 | 销售切入点 | sales_analysis.sales_entry_points | EntryPointsCard |
| 8 | 首次联系建议 | sales_analysis.contact_strategy | ContactStrategyCard |
| 9 | 下一步行动 | sales_analysis.next_actions | NextActionsCard |
| 10 | 开发信 | messages | MessageCard |

★ = MVP 最高优先级展示模块。用户看到的第一眼内容。

10个展示模块，来自3次AI调用（阶段2-4） + 搜索阶段（阶段1）。

### 分析元信息栏

每个分析结果页面顶部显示元信息：

```
━━━━━━━━━━━━━━━━
分析时间：2026-06-22 18:35
数据完整度：65% · 信息来源较少，分析结果仅供参考
[重新分析]  [复制完整报告]
━━━━━━━━━━━━━━━━
```

- **分析时间**：数据库 `generated_at` 字段，精确到分钟
- **数据完整度**：来自阶段1的 `data_confidence`
- **重新分析按钮**：点击后直接用原始输入重新执行四阶段分析，无需重新输入
- **复制完整报告按钮**：一键复制全部10个模块的内容到剪贴板

### 一键复制完整报告

销售常用场景：把分析结果分享到微信群、飞书群、企业微信群。

点击「复制完整报告」后，剪贴板内容格式：

```
━━━ AI客户分析报告 ━━━

公司：华为技术有限公司
分析时间：2026-06-22 18:35
数据完整度：85% · 高

━━━ AI销售建议 ━━━
推荐跟进 · 客户价值：高

推荐理由：
✓ 企业正在扩张
✓ 新增销售岗位
✓ 正在布局海外市场

建议联系：市场负责人、销售负责人
推荐时机：未来30天

━━━ 客户评分 ━━━
86分 · A级客户
...（所有模块内容，纯文本格式）
```

实现方式：前端 `CopyFullReport` 组件，遍历所有卡片组件提取文本内容，拼接为格式化纯文本，写入 `navigator.clipboard`。

### C-R-E 可信度设计（核心差异化）

这是 V1 最重要的产品设计原则。所有分析结论必须以 **C-R-E 三元组** 形式呈现：

```
结论（Conclusion） → 原因（Reason） → 证据（Evidence）
```

**前端展示规范：**

**AI销售建议模块（页面最顶部，第一个展示）：**
```
━━━━━━━━━━━━━━━━
AI销售建议

推荐跟进 ✅

客户价值：高

推荐理由：
✓ 企业正在扩张
✓ 新增销售岗位
✓ 正在布局海外市场

建议联系：市场负责人、销售负责人
推荐时机：未来30天
━━━━━━━━━━━━━━━━
```

这是用户看到的第一眼内容。Verdict 有三种：
- ✅ **推荐跟进** (recommended)
- ⚠️ **谨慎跟进** (cautious)
- ❌ **暂不建议** (not_recommended)

**下一步行动模块：**
```
━━━━━━━━━━━━━━━━
下一步行动

① 查看官网招聘页，了解具体招聘岗位和团队规模
   预计耗时：3分钟

② 在LinkedIn上找到销售负责人并了解其背景
   预计耗时：5分钟

③ 发送开发信（邮件+LinkedIn双渠道）
   预计耗时：2分钟

总耗时：约10分钟
━━━━━━━━━━━━━━━━
```

**数据完整度模块：**
```
━━━━━━━━━━━━━━━━
数据完整度

65% · 中

获取到官网、3条新闻

未找到：招聘信息、LinkedIn页面

来源信息较少，分析结果仅供参考
━━━━━━━━━━━━━━━━
```

**评分模块：**
```
━━━━━━━━━━━━━━━━
客户价值评分

86分
A级客户

企业处于扩张阶段，销售价值较高

评分依据
✓ 近期招聘销售岗位
✓ 新增产品线
✓ 正在拓展海外市场
━━━━━━━━━━━━━━━━
```

**信号模块：**
```
━━━━━━━━━━━━━━━━
扩张信号

企业正在扩张

原因：官网招聘页面显示大量新增岗位

证据：官网招聘页面显示新增10个销售岗位
来源：https://company.com/careers
━━━━━━━━━━━━━━━━
```

**需求模块：**
```
━━━━━━━━━━━━━━━━
潜在需求 · 高优先级

CRM管理系统

判断依据：销售团队正在快速扩张，需要系统化管理客户

证据：官网招聘页面显示新增10个销售岗位
━━━━━━━━━━━━━━━━
```

### 用户价值

从「AI猜测」变成「AI基于事实分析」：

- ❌ 之前：AI说这个企业86分
- ✅ 之后：AI说86分，因为它在扩张、招人、推新产品，证据是官网链接

**这是销售愿意为分析结果付费的关键因素。**

---

## 六、SSE 接口设计

### 创建分析任务

```
POST /api/analysis
Content-Type: application/json

Request:
{
  "input": "华为" | "https://www.huawei.com" | "华为，信息与通信技术..."
}
```

自动识别输入类型（公司名 / URL / 简介）。

**Response (201):**
```json
{
  "task_id": "abc123"
}
```

### 重新分析

```
POST /api/analysis
Content-Type: application/json

Request:
{
  "input": "华为",
  "reanalyze_from": "task_xyz"  // 可选，标记来源任务
}
```

与创建任务共用同一接口，`reanalyze_from` 仅用于关联记录（方便后续分析用户行为）。重新分析创建全新的 `analysis_task`，旧任务保留。

### 订阅分析进度

```
GET /api/analysis/{task_id}/stream
Accept: text/event-stream
```

**SSE 事件序列:**

```text
event: search_complete
data: {"company_name": "华为技术有限公司", ...}

event: company_analysis
data: {"company_profile": {...}, "signals": [...], ...}

event: sales_analysis
data: {"customer_score": {...}, "potential_needs": [...], ...}

event: messages
data: {"email_message": "...", "linkedin_message": "...", "wechat_message": "..."}

event: done
data: {}
```

**错误事件:**
```text
event: error
data: {"stage": "company_analysis", "message": "LLM timeout"}

event: stage_failed
data: {"stage": "messages", "retry": true}
```

---

## 七、任务状态机

```
PENDING ──→ RUNNING ──→ SUCCESS
              │
              ├──→ PARTIAL_SUCCESS  (部分阶段失败但超时未到，展示已完成结果)
              │
              └──→ FAILED           (全部失败或搜索失败)
```

`analysis_task` 表字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID? | 游客为null |
| input_text | TEXT | 用户原始输入 |
| status | ENUM | PENDING/RUNNING/SUCCESS/PARTIAL_SUCCESS/FAILED |
| company_context | JSONB | 阶段1输出 |
| company_analysis | JSONB | 阶段2输出 |
| sales_analysis | JSONB | 阶段3输出 |
| messages | JSONB | 阶段4输出 |
| error_info | JSONB | 失败信息 |
| generated_at | TIMESTAMP | 分析生成时间（页面显示用） |
| created_at | TIMESTAMP | 创建时间 |
| completed_at | TIMESTAMP | 完成时间 |

### 页面刷新恢复

- 前端创建任务后，将 `task_id` 存入 URL hash（如 `/#task=abc123`）
- 页面刷新时，前端读取 hash，调用 `GET /api/analysis/{task_id}` 获取当前状态
- 若任务仍在RUNNING，重新建立SSE连接继续接收
- 若任务已完成，直接渲染缓存结果

---

## 八、失败处理

### 原则

**部分成功展示 + 总超时兜底**。

### 具体策略

1. **搜索失败（阶段1）** → 整个任务 FAILED，提示用户检查输入
2. **某阶段LLM失败** → 该阶段标记失败，后续阶段仍尝试执行（不传递失败阶段的上下文）
3. **总超时30秒到达** → 立即终止等待，已完成的阶段正常展示，未完成的显示失败占位
4. **失败模块** → 展示"❌ 生成失败"，提供「重新生成」按钮，单模块重试

### 一键重新分析

场景：第一次分析失败、官网信息更新、Prompt升级后想看新结果。

**实现方式：** 前端用任务的原始 `input_text` 调用 `POST /api/analysis` 创建新任务，无需用户重新输入。

**入口：**
- 分析结果页顶部元信息栏：「重新分析」按钮
- 历史记录页：每条记录的操作列 → 「重新分析」按钮
- 分析失败后：结果区域的 CTA 按钮

重新分析会创建一个全新的 `analysis_task`，旧任务保留不变。用户可在历史记录中对比新旧结果。

### 前端展示示例

```
✓ 企业分析完成
✓ 销售分析完成
❌ 开发信生成失败  [重新生成]
```

---

## 九、游客体系

### V1 极简方案

- **无需登录**，打开即可使用
- **每日3次免费分析**（localStorage 计数 + 后端 IP 辅助校验）
- **达到上限** → 弹窗输入邮箱 → 额外获得10次
- **无需验证码、无需密码、无需注册**

### 前端存储

```
localStorage:
  analysis_count: 3          // 今日已用次数
  analysis_date: "2026-06-22" // 计数日期
  email: "user@example.com"   // 邮箱（填写后）
  bonus_remaining: 10         // 剩余奖励次数
```

### 后端辅助校验

- 记录 IP + 日期 + 使用次数
- 若前端存储被清除，后端 IP 记录作为兜底
- V1不做严格的防绕过，只防正常用户超限

---

## 十、LLM Provider 模式

### 抽象层设计

```python
# llm/base.py
class BaseLLMProvider(ABC):
    @abstractmethod
    async def chat(self, messages: list[dict], **kwargs) -> str:
        """发送对话请求，返回文本响应"""
        pass

    @abstractmethod
    async def chat_json(self, messages: list[dict], schema: dict, **kwargs) -> dict:
        """发送对话请求，返回结构化JSON"""
        pass
```

### 配置切换

```env
# .env
LLM_PROVIDER=deepseek        # deepseek | openai
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

切换为 OpenAI 只需改环境变量，业务代码零改动：
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxx
```

### V1使用策略

- 所有阶段使用同一模型（deepseek-chat）
- 不同阶段使用不同的 System Prompt（存放在 `prompts/` 目录）
- 使用 JSON mode 确保结构化输出

---

## 十一、数据库设计

### users
| 列 | 类型 | 说明 |
|----|------|------|
| id | UUID PK | |
| email | VARCHAR(255) UNIQUE | 可空（游客） |
| plan | VARCHAR(50) | free / pro / team |
| analysis_count_today | INT | 今日已用 |
| analysis_date | DATE | 计数日期 |
| bonus_remaining | INT | 奖励剩余次数 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### analysis_tasks
| 列 | 类型 | 说明 |
|----|------|------|
| id | UUID PK | |
| user_id | UUID? FK → users.id | 游客为null |
| input_text | TEXT | 用户输入 |
| status | VARCHAR(20) | pending/running/success/partial_success/failed |
| company_context | JSONB | 阶段1结果 |
| company_analysis | JSONB | 阶段2结果 |
| sales_analysis | JSONB | 阶段3结果 |
| messages | JSONB | 阶段4结果 |
| error_info | JSONB | {stage, message} |
| total_duration_ms | INT | 总耗时 |
| generated_at | TIMESTAMP | 分析生成时间（显示给用户） |
| created_at | TIMESTAMP | |
| completed_at | TIMESTAMP | |

### usage_logs
| 列 | 类型 | 说明 |
|----|------|------|
| id | UUID PK | |
| user_id | UUID? FK → users.id | |
| task_id | UUID FK → analysis_tasks.id | |
| ip_address | VARCHAR(45) | 用于游客限流 |
| created_at | TIMESTAMP | |

---

## 十二、V1明确不做

### 产品定位边界

本产品定位：**客户分析工具**，不是销售工具。

- 输入一个公司 → 输出一份销售可直接使用的客户情报报告
- 不越界做销售流程管理、自动化、协作

### 不做清单

- ❌ Agent / 工作流
- ❌ CRM 集成
- ❌ 自动发邮件（产品定位边界外）
- ❌ 企业微信 / 飞书集成
- ❌ 向量数据库 / RAG
- ❌ 多模型路由
- ❌ 支付系统（V1手动处理付费）
- ❌ 团队协作
- ❌ PDF 导出（可用「复制完整报告」替代，分享到微信/飞书/企业微信即可）
- ❌ Excel 导出（同上）
- ❌ 用户名密码 / OAuth登录
- ❌ 验证码系统

---

## 十三、成功标准

| 指标 | 目标 | 衡量方式 |
|------|------|---------|
| 真实用户 | 10个 | 分析记录中唯一IP/邮箱数 ≥ 10 |
| 分析次数 | 100次 | analysis_tasks 表行数 ≥ 100 |
| 付费用户 | 1个 | users 表中 plan = 'pro' 或 'team' ≥ 1 |
| 上线时间 | 30天内 | 从开发启动日算起 |

---

## 十四、Prompts 设计原则

### C-R-E 硬约束

所有 Prompt 必须包含以下强制要求：

1. **任何结论必须有原因** — 不允许只输出结论
2. **任何原因必须有证据** — 证据必须来源于搜索到的公开信息（新闻、官网、招聘页等）
3. **无法找到证据时** — 标注「信息不足，以下为基于行业经验的推测」而非编造证据
4. **证据必须可追溯** — 附上来源URL（如有）

### 各阶段 Prompt 要求

1. **company_analysis.txt**: 从公司公开信息中提取结构化画像。signals/recent_updates/risks 每个条目必须包含 signal/reason/evidence/source 四字段
2. **sales_analysis.txt**: 基于企业画像推断需求。必须输出以下关键模块：
   - `customer_score`: 含 factors 数组
   - `potential_needs` + `sales_entry_points`: 含 evidence
   - **`executive_summary`**: AI销售建议，必须有 verdict/reasons/suggested_contacts/best_timing
   - **`next_actions`**: 下一步行动，每个 action 含 step/action/estimated_time，总计控制在10分钟左右
3. **outreach_generation.txt**: 基于前两阶段结论生成开发信。开发信中的具体提及必须来源于 C-R-E 证据链，避免空泛的模板话术
