"""使用 DeepSeek 联网搜索替代 DuckDuckGo，零依赖，国内直连"""
import json
import logging
from app.llm import get_llm

logger = logging.getLogger("uvicorn")

SEARCH_PROMPT = """你是一个企业信息搜索助手。用户会输入一个公司名称或官网，你需要搜索并整理该公司的基本信息。

请通过联网搜索获取以下信息，并以 JSON 格式返回：

{
  "company_name": "公司全称",
  "website": "官网URL（如有）",
  "industry": "所属行业",
  "website_content": "从官网获取的公司简介（200字以内）",
  "news": [
    {"title": "新闻标题", "url": "链接", "snippet": "摘要", "date": "日期"}
  ],
  "data_confidence": {
    "detail": "数据来源说明"
  }
}

规则：
- 如果能搜到官网和新闻，news 数组填 3-10 条
- 如果搜不到，对应字段留空或空数组
- website_content 优先从官网提取，没有官网就用搜索结果拼凑
- 所有信息必须来自搜索结果，不要编造
- 只输出 JSON，不要任何其他文字"""


class SearchService:
    """DeepSeek 联网搜索，替代 DuckDuckGo"""

    def __init__(self):
        self.llm = get_llm()

    async def search(self, company_input: str) -> dict:
        logger.info(f"DeepSeek 联网搜索: {company_input}")

        messages = [
            {"role": "system", "content": SEARCH_PROMPT},
            {"role": "user", "content": company_input},
        ]

        try:
            text = await self.llm.chat_with_search(messages, temperature=0.1, max_tokens=3000)
            text = text.strip()

            # 清理 markdown
            if text.startswith("```"):
                lines = text.split("\n")
                text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

            data = json.loads(text)

            # 计算置信度
            news_count = len(data.get("news", []))
            has_website = bool(data.get("website_content"))
            score = 10  # base
            detail_parts = []
            if has_website:
                score += 30
                detail_parts.append("获取到官网内容")
            if news_count >= 5:
                score += 30
                detail_parts.append(f"搜索到{news_count}条新闻")
            elif news_count >= 3:
                score += 20
                detail_parts.append(f"搜索到{news_count}条新闻")
            elif news_count > 0:
                score += 10
                detail_parts.append(f"搜索到{news_count}条新闻")
            level = "高" if score >= 80 else "中" if score >= 50 else "低"

            data["data_confidence"] = {
                "score": min(score, 100),
                "level": level,
                "detail": "、".join(detail_parts) if detail_parts else "未获取到有效信息",
            }

            logger.info(f"搜索完成: {news_count} 条新闻, 置信度 {score}%")
            return data

        except json.JSONDecodeError:
            logger.warning(f"搜索返回非 JSON，使用降级模式")
            return {
                "company_name": company_input,
                "website": "",
                "industry": "",
                "website_content": "",
                "news": [],
                "data_confidence": {"score": 10, "level": "低", "detail": "搜索未返回有效数据"},
            }
        except Exception as e:
            logger.error(f"搜索失败: {e}")
            return {
                "company_name": company_input,
                "website": "",
                "industry": "",
                "website_content": "",
                "news": [],
                "data_confidence": {"score": 10, "level": "低", "detail": f"搜索异常: {str(e)[:50]}"},
            }
