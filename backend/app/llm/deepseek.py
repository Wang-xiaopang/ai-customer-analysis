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
