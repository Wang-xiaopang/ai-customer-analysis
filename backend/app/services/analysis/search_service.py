"""快速识别企业基本信息，不做耗时联网搜索"""
import json
import logging
from datetime import date
from app.llm import get_llm

logger = logging.getLogger("uvicorn")

SEARCH_PROMPT = """你是一个企业信息助手。根据用户输入的公司名称或官网，快速识别企业基本信息。

当前时间：{today}

请以 JSON 格式返回（只输出 JSON，不要其他文字）：
{
  "company_name": "公司全称",
  "website": "官网URL（不确定就留空）",
  "industry": "所属行业",
  "website_content": "公司简介（基于你的知识，100字以内）",
  "news": []
}

规则：
- company_name 必须是公司的正式全称
- 如果用户输入的是URL，从中提取公司名
- 不要编造新闻，news 保持空数组
- 只输出 JSON"""


class SearchService:
    """快速企业识别"""

    def __init__(self):
        self.llm = get_llm()

    async def search(self, company_input: str) -> dict:
        today_str = date.today().strftime("%Y年%m月%d日")
        prompt = SEARCH_PROMPT.replace("{today}", today_str)

        logger.info(f"企业识别: {company_input}")
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": company_input},
        ]

        try:
            text = await self.llm.chat(messages, temperature=0.1, max_tokens=500)
            text = text.strip()
            if text.startswith("```"): text = text.split("\n")[1:-1][0] if text.endswith("```") else text
            data = json.loads(text)
            data.setdefault("news", [])
            data["data_confidence"] = {
                "score": 40, "level": "中",
                "detail": "基于AI知识库识别（未联网搜索）",
            }
            logger.info(f"识别完成: {data.get('company_name')}, 行业: {data.get('industry')}")
            return data
        except Exception as e:
            logger.warning(f"识别失败: {e}")
            return {
                "company_name": company_input, "website": "", "industry": "",
                "website_content": "", "news": [],
                "data_confidence": {"score": 10, "level": "低", "detail": "企业识别异常"},
            }
