import json
import re
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
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=kwargs.get("temperature", 0.3),
                max_tokens=kwargs.get("max_tokens", 4096),
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            raise RuntimeError(f"LLM 调用失败: {e}") from e

    async def chat_json(self, messages: list[dict], json_schema: dict, **kwargs) -> dict:
        schema_str = json.dumps(json_schema, ensure_ascii=False, indent=2)
        system_msg = messages[0]["content"] if messages and messages[0]["role"] == "system" else ""
        messages[0] = {
            "role": "system",
            "content": (
                f"{system_msg}\n\n"
                f"You MUST respond with valid JSON that matches this schema:\n"
                f"{schema_str}\n"
                f"Output ONLY the JSON object, no markdown, no explanation, no other text."
            ),
        }

        text = ""
        for attempt in range(3):
            try:
                text = await self.chat(messages, **kwargs)
                text = text.strip()

                # Remove markdown code fences
                text = re.sub(r"^```(?:json)?\s*\n", "", text)
                text = re.sub(r"\n```\s*$", "", text)

                return json.loads(text)
            except json.JSONDecodeError:
                if attempt < 2:
                    # Retry with stronger prompt
                    messages.append({
                        "role": "user",
                        "content": (
                            f"Your previous response was not valid JSON. "
                            f"Please output ONLY the JSON object matching the schema. "
                            f"No markdown, no explanation."
                        ),
                    })
                    continue
                # On final attempt, try to extract JSON from the text
                match = re.search(r"\{[\s\S]*\}", text)
                if match:
                    try:
                        return json.loads(match.group(0))
                    except json.JSONDecodeError:
                        pass
                raise RuntimeError(
                    f"LLM 返回了无效的 JSON（已重试 3 次）。原始响应前 200 字符: {text[:200]}"
                ) from None
