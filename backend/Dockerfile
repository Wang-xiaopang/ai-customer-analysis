# ai-customer-analysis/backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# pip 也用阿里云源加速
COPY requirements.txt .
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
