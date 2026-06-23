# 零成本部署指南

三个免费服务搭一个完整线上应用。

## 最终效果

```
用户访问 xxx.vercel.app
        │
        ▼
   Vercel (前端 Next.js)
        │
        │ /api/* 转发
        ▼
   Railway (后端 FastAPI)
        │
        ▼
   Neon (PostgreSQL)
```

每月 0 元。

---

## 第一步：推代码到 GitHub

```bash
cd ai-customer-analysis

# 创建 GitHub 仓库（在 github.com 上新建一个空仓库，不要勾选 README）

git remote add origin https://github.com/你的用户名/ai-customer-analysis.git
git branch -M main
git push -u origin main
```

---

## 第二步：Neon 数据库（3分钟）

1. 打开 [neon.tech](https://neon.tech) → Sign Up（用 GitHub 登录）
2. 创建项目 → 选择区域（选离用户最近的）
3. 创建后拿到连接字符串，长这样：
   ```
   postgresql://customer_analysis:xxxxxx@ep-xxx.us-east-2.aws.neon.tech/customer_analysis?sslmode=require
   ```
4. 在 Neon 控制台 → SQL Editor → 运行以下建表 SQL：
   ```sql
   CREATE TABLE users (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       email VARCHAR(255) UNIQUE,
       plan VARCHAR(50) DEFAULT 'free',
       analysis_count_today INTEGER DEFAULT 0,
       analysis_date DATE,
       bonus_remaining INTEGER DEFAULT 0,
       created_at TIMESTAMPTZ DEFAULT now(),
       updated_at TIMESTAMPTZ DEFAULT now()
   );

   CREATE TABLE analysis_tasks (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID REFERENCES users(id),
       input_text TEXT NOT NULL,
       status VARCHAR(20) DEFAULT 'pending',
       company_context JSONB,
       company_analysis JSONB,
       sales_analysis JSONB,
       messages JSONB,
       error_info JSONB,
       total_duration_ms INTEGER,
       generated_at TIMESTAMPTZ,
       created_at TIMESTAMPTZ DEFAULT now(),
       completed_at TIMESTAMPTZ
   );

   CREATE TABLE usage_logs (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID REFERENCES users(id),
       task_id UUID NOT NULL REFERENCES analysis_tasks(id),
       ip_address VARCHAR(45) NOT NULL,
       created_at TIMESTAMPTZ DEFAULT now()
   );
   ```
   ⚠️ 这一步很重要。Railway 后端启动后也会自动建表，但先在 Neon 建好更稳妥。

---

## 第三步：Railway 后端（5分钟）

1. 打开 [railway.app](https://railway.app) → Login with GitHub
2. **New Project** → Deploy from GitHub repo → 选你的 `ai-customer-analysis` 仓库
3. Railway 自动检测到 `backend/Dockerfile`，会自己构建
4. 设置环境变量（在 Railway 项目 → Variables）：

   ```
   DATABASE_URL = postgresql://xxx@ep-xxx.neon.tech/customer_analysis?sslmode=require
   LLM_PROVIDER = deepseek
   DEEPSEEK_API_KEY = sk-你的密钥
   DEEPSEEK_BASE_URL = https://api.deepseek.com/v1
   DEEPSEEK_MODEL = deepseek-chat
   SERPAPI_API_KEY = 你的密钥
   CORS_ORIGIN = https://xxx.vercel.app
   ```
   ⚠️ `CORS_ORIGIN` 先随便填一个，等 Vercel 部署完拿到域名再回来改。

5. Railway 会自动分配一个域名，类似 `xxx.up.railway.app`
6. 访问 `https://xxx.up.railway.app/api/health` 验证 → 返回 `{"status":"ok"}`

---

## 第四步：Vercel 前端（3分钟）

1. 打开 [vercel.com](https://vercel.com) → Login with GitHub
2. **Add New Project** → 选你的 `ai-customer-analysis` 仓库
3. **关键配置**：Root Directory 设为 `frontend`
4. Framework 自动识别为 Next.js
5. 环境变量：
   ```
   BACKEND_URL = https://xxx.up.railway.app
   ```
6. 点击 Deploy
7. 得到一个域名 `xxx.vercel.app`

---

## 第五步：连通

1. 回到 Railway → Variables → 把 `CORS_ORIGIN` 改为 `https://xxx.vercel.app`
2. 打开 `frontend/vercel.json`，把 `YOUR_BACKEND_URL` 替换为 Railway 域名
3. 提交并推送到 GitHub：
   ```bash
   git add frontend/vercel.json
   git commit -m "fix: update backend URL for production"
   git push
   ```
4. Vercel 自动重新部署
5. 打开 `https://xxx.vercel.app` → 输入公司名 → 分析成功 🎉

---

## 免费额度够用吗？

| 服务 | 免费额度 | MVP 够不够 |
|------|---------|-----------|
| **Vercel** | 100GB 带宽/月, 6000 构建分钟 | ✅ 够用 |
| **Railway** | $5 免费额度/月, 约 50 万次 API 请求 | ✅ 够用 |
| **Neon** | 0.5GB 存储, 100 小时计算/月 | ✅ 够用 |
| **DeepSeek** | 注册送 500 万 tokens | ✅ 约 500-1000 次分析 |
| **SerpAPI** | 100 次搜索/月 免费 | ✅ 够 MVP |

总计：**¥0/月**，足够支撑 10 个真实用户 + 100 次分析的 MVP 目标。

---

## 后续升级路径

| 什么时候升级 | 升什么 |
|-------------|--------|
| 用户超过 50 个 | Railway Hobby 计划 ($5/月) |
| 需要自定义域名 | Vercel 绑域名（免费）+ 买域名 (¥30/年) |
| 数据库不够 | Neon 免费额度用完 → Railway 内置 PostgreSQL |
| 搜索次数不够 | SerpAPI 付费计划 或 换 Bing API |

等有了第一个付费用户，这些成本都能覆盖。
