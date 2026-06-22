# ai-customer-analysis/backend/app/services/analysis/sales_analyzer.py
from app.llm import get_llm
from app.prompts import load_prompt

SALES_ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "customer_score": {
            "type": "object",
            "properties": {
                "score": {"type": "integer", "minimum": 0, "maximum": 100},
                "level": {"type": "string", "enum": ["A", "B", "C", "D"]},
                "reason": {"type": "string"},
                "factors": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["score", "level", "reason", "factors"],
        },
        "potential_needs": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "need": {"type": "string"},
                    "priority": {"type": "string", "enum": ["高", "中", "低"]},
                    "reason": {"type": "string"},
                    "evidence": {"type": "string"},
                },
                "required": ["need", "priority", "reason", "evidence"],
            },
        },
        "sales_entry_points": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "direction": {"type": "string"},
                    "reason": {"type": "string"},
                    "evidence": {"type": "string"},
                    "suggested_talk": {"type": "string"},
                },
                "required": ["direction", "reason", "evidence", "suggested_talk"],
            },
        },
        "contact_strategy": {
            "type": "object",
            "properties": {
                "best_topic": {"type": "string"},
                "reason": {"type": "string"},
                "avoid_topics": {"type": "array", "items": {"type": "string"}},
                "recommended_channel": {"type": "string"},
            },
            "required": ["best_topic", "reason", "avoid_topics", "recommended_channel"],
        },
        "executive_summary": {
            "type": "object",
            "properties": {
                "verdict": {"type": "string", "enum": ["recommended", "cautious", "not_recommended"]},
                "verdict_text": {"type": "string"},
                "customer_value": {"type": "string"},
                "reasons": {"type": "array", "items": {"type": "string"}},
                "suggested_contacts": {"type": "array", "items": {"type": "string"}},
                "best_timing": {"type": "string"},
            },
            "required": ["verdict", "verdict_text", "customer_value", "reasons", "suggested_contacts", "best_timing"],
        },
        "next_actions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "step": {"type": "integer"},
                    "action": {"type": "string"},
                    "url": {"type": ["string", "null"]},
                    "estimated_time": {"type": "string"},
                },
                "required": ["step", "action", "estimated_time"],
            },
        },
    },
    "required": ["customer_score", "potential_needs", "sales_entry_points", "contact_strategy", "executive_summary", "next_actions"],
}


class SalesAnalyzer:
    def __init__(self):
        self.llm = get_llm()
        self.prompt = load_prompt("sales_analysis")

    async def analyze(self, company_context: dict, company_analysis: dict) -> dict:
        input_data = f"Company Context:\n{company_context}\n\nCompany Analysis:\n{company_analysis}"
        messages = [
            {"role": "system", "content": self.prompt},
            {"role": "user", "content": input_data},
        ]
        return await self.llm.chat_json(messages, SALES_ANALYSIS_SCHEMA)
