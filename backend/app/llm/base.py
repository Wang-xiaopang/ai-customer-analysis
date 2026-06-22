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
