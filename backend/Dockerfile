# ai-customer-analysis/backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# pip 用阿里云源加速
COPY requirements.txt .
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ -r requirements.txt

COPY . .

# 强制 Python 不缓冲输出，Docker 日志才看得到
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]
