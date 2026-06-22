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
