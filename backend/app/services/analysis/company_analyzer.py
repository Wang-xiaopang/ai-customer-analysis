# ai-customer-analysis/backend/app/services/analysis/company_analyzer.py
from app.llm import get_llm
from app.prompts import load_prompt

COMPANY_ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "company_profile": {
            "type": "object",
            "properties": {
                "industry": {"type": "string"},
                "scale": {"type": "string"},
                "stage": {"type": "string"},
                "main_business": {"type": "string"},
            },
            "required": ["industry", "scale", "stage", "main_business"],
        },
        "signals": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "signal": {"type": "string"},
                    "reason": {"type": "string"},
                    "evidence": {"type": "string"},
                    "source": {"type": "string"},
                },
                "required": ["signal", "reason", "evidence", "source"],
            },
        },
        "recent_updates": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "evidence": {"type": "string"},
                    "source": {"type": "string"},
                },
                "required": ["title", "description", "evidence", "source"],
            },
        },
        "risks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "risk": {"type": "string"},
                    "reason": {"type": "string"},
                    "evidence": {"type": "string"},
                    "source": {"type": "string"},
                },
                "required": ["risk", "reason", "evidence", "source"],
            },
        },
    },
    "required": ["company_profile", "signals", "recent_updates", "risks"],
}


class CompanyAnalyzer:
    def __init__(self):
        self.llm = get_llm()
        self.prompt = load_prompt("company_analysis")

    async def analyze(self, company_context: dict) -> dict:
        messages = [
            {"role": "system", "content": self.prompt},
            {"role": "user", "content": f"Company context:\n{company_context}"},
        ]
        return await self.llm.chat_json(messages, COMPANY_ANALYSIS_SCHEMA)
