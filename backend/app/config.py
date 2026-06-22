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
