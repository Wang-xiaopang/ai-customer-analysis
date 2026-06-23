# AI客户分析助手 · 部署指南

## 架构

```
用户 → 80端口 → Frontend (Next.js) → /api/* → Backend (FastAPI) → PostgreSQL
```

三个容器通过 Docker Compose 编排，前端对外暴露 80 端口。

---

## 服务器要求

| 项目 | 最低配置 |
|------|---------|
| 系统 | Ubuntu 20.04+ / Debian 11+ |
| CPU | 1 核 |
| 内存 | 2 GB |
| 磁盘 | 20 GB |
| 软件 | Docker + Docker Compose |

---

## 部署步骤

### 1. 登录服务器，安装 Docker

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker
sudo systemctl enable docker && sudo systemctl start docker

# 验证
docker --version
docker compose version
```

### 2. 上传项目到服务器

```bash
# 在本地打包（排除 node_modules 和 .next）
cd ai-customer-analysis
tar --exclude='node_modules' --exclude='.next' --exclude='__pycache__' \
    --exclude='.git' -czf ../deploy.tar.gz .

# 上传到服务器
scp ../deploy.tar.gz root@你的服务器IP:/opt/

# 在服务器上解压
ssh root@你的服务器IP
cd /opt && mkdir ai-customer-analysis && cd ai-customer-analysis
tar xzf ../deploy.tar.gz
```

### 3. 配置环境变量

```bash
cd /opt/ai-customer-analysis
cp .env.production .env

# 编辑 .env，填入真实值
vim .env
```

必须填写的三项：

```env
DB_PASSWORD=设置一个强密码
DEEPSEEK_API_KEY=sk-你的密钥        # https://platform.deepseek.com
SERPAPI_API_KEY=你的密钥             # https://serpapi.com
CORS_ORIGIN=http://你的服务器IP       # 或 https://你的域名
```

### 4. 启动

```bash
cd /opt/ai-customer-analysis
docker compose up -d
```

首次启动会自动构建镜像（约 2-3 分钟）。

### 5. 验证

```bash
# 查看服务状态
docker compose ps

# 应该看到 3 个服务都是 Up：
#  NAME                                 STATUS
#  ai-customer-analysis-db-1           Up (healthy)
#  ai-customer-analysis-backend-1      Up
#  ai-customer-analysis-frontend-1     Up

# 测试前端
curl http://localhost

# 测试后端健康检查
curl http://localhost/api/health
```

打开浏览器访问 `http://你的服务器IP` 即可使用。

---

## 常用运维命令

```bash
cd /opt/ai-customer-analysis

# 查看日志
docker compose logs -f              # 全部
docker compose logs -f backend      # 只看后端

# 重启
docker compose restart

# 更新代码后重新构建
docker compose build --no-cache
docker compose up -d

# 停止
docker compose down

# 停止并删除数据（危险！）
docker compose down -v

# 数据库备份
docker compose exec db pg_dump -U customer_analysis customer_analysis > backup.sql
```

---

## 环境变量完整说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_USER` | 数据库用户名 | customer_analysis |
| `DB_PASSWORD` | 数据库密码 | **必填** |
| `DB_NAME` | 数据库名 | customer_analysis |
| `LLM_PROVIDER` | LLM提供商 | deepseek |
| `DEEPSEEK_API_KEY` | DeepSeek密钥 | **必填** |
| `DEEPSEEK_BASE_URL` | DeepSeek API地址 | https://api.deepseek.com/v1 |
| `DEEPSEEK_MODEL` | 模型名称 | deepseek-chat |
| `SERPAPI_API_KEY` | SerpAPI密钥 | **必填** |
| `CORS_ORIGIN` | 允许的前端域名 | http://localhost |

---

## 如果需要域名 + HTTPS

推荐加一层 Nginx + Let's Encrypt：

```bash
# 安装 Nginx
sudo apt install nginx certbot python3-certbot-nginx -y

# 配置反向代理
sudo tee /etc/nginx/sites-available/customer-analysis << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/customer-analysis /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 申请 SSL 证书
sudo certbot --nginx -d your-domain.com
```

然后把 docker-compose.yml 中 frontend 的端口改为只监听本地：
```yaml
ports:
  - "127.0.0.1:3000:3000"
```

同时更新 `.env` 中的 `CORS_ORIGIN=https://your-domain.com`。
