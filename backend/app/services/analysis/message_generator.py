# ai-customer-analysis/backend/app/services/analysis/message_generator.py
from app.llm import get_llm
from app.prompts import load_prompt

MESSAGES_SCHEMA = {
    "type": "object",
    "properties": {
        "email_message": {"type": "string"},
        "linkedin_message": {"type": "string"},
        "wechat_message": {"type": "string"},
    },
    "required": ["email_message", "linkedin_message", "wechat_message"],
}


class MessageGenerator:
    def __init__(self):
        self.llm = get_llm()
        self.prompt = load_prompt("outreach_generation")

    async def generate(
        self, company_context: dict, company_analysis: dict, sales_analysis: dict
    ) -> dict:
        input_data = (
            f"Company Context:\n{company_context}\n\n"
            f"Company Analysis:\n{company_analysis}\n\n"
            f"Sales Analysis:\n{sales_analysis}"
        )
        messages = [
            {"role": "system", "content": self.prompt},
            {"role": "user", "content": input_data},
        ]
        return await self.llm.chat_json(messages, MESSAGES_SCHEMA)
