# ai-customer-analysis/backend/app/services/analysis/search_service.py
import re
import httpx
from app.config import settings


class SearchService:
    BASE_URL = "https://serpapi.com/search"

    def __init__(self):
        self.api_key = settings.serpapi_api_key

    def _detect_input_type(self, text: str) -> str:
        """Detect if input is URL, company name, or description."""
        text = text.strip()
        if re.match(r"^https?://", text):
            return "url"
        if len(text) > 100:
            return "description"
        return "company_name"

    async def search(self, company_input: str) -> dict:
        input_type = self._detect_input_type(company_input)

        if input_type == "url":
            website = company_input.strip()
            company_name = website  # Will be refined after scraping
        else:
            website = None
            company_name = company_input.strip()

        # Search for company info
        queries = [
            f"{company_name} 公司",
            f"{company_name} 招聘 2025",
            f"{company_name} 最新动态",
        ]

        all_news = []
        website_content = ""
        linkedin_found = False

        async with httpx.AsyncClient(timeout=15) as client:
            for query in queries[:2]:  # Limit to 2 searches to stay under 30s
                try:
                    resp = await client.get(
                        self.BASE_URL,
                        params={
                            "api_key": self.api_key,
                            "q": query,
                            "engine": "google",
                            "num": 5,
                            "gl": "cn",
                            "hl": "zh-cn",
                        },
                    )
                    data = resp.json()

                    # Extract organic results
                    for result in data.get("organic_results", []):
                        all_news.append({
                            "title": result.get("title", ""),
                            "url": result.get("link", ""),
                            "snippet": result.get("snippet", ""),
                            "date": result.get("date", ""),
                        })

                    # Check for LinkedIn
                    if not linkedin_found:
                        for r in data.get("organic_results", []):
                            if "linkedin.com/company" in r.get("link", "").lower():
                                linkedin_found = True
                                break

                except Exception:
                    continue  # Non-critical search failures are tolerated

        # Detect website from results if not provided
        if not website and all_news:
            for news in all_news:
                url = news.get("url", "")
                if url and not any(
                    d in url for d in ["linkedin.com", "facebook.com", "wikipedia.org", "zhihu.com", "weibo.com"]
                ):
                    # Extract domain as potential website
                    match = re.match(r"https?://([^/]+)", url)
                    if match:
                        website = f"https://{match.group(1)}"
                        break

        # Try to fetch website content
        if website:
            try:
                resp = await client.get(website, timeout=10, follow_redirects=True)
                # Simple text extraction from HTML
                html = resp.text
                # Strip HTML tags for basic content
                clean = re.sub(r"<[^>]+>", " ", html)
                clean = re.sub(r"\s+", " ", clean)
                website_content = clean[:3000]  # First 3000 chars
            except Exception:
                website_content = ""

        # Calculate data confidence
        confidence = self._calculate_confidence(
            has_website=bool(website_content),
            news_count=len(all_news),
            has_linkedin=linkedin_found,
        )

        return {
            "company_name": company_name,
            "website": website or "",
            "industry": "",
            "website_content": website_content,
            "news": all_news[:10],
            "data_confidence": confidence,
        }

    def _calculate_confidence(
        self, has_website: bool, news_count: int, has_linkedin: bool
    ) -> dict:
        score = 0
        detail_parts = []

        if has_website:
            score += 30
            detail_parts.append("获取到官网内容")
        if news_count >= 3:
            score += 25
            detail_parts.append(f"获取到{news_count}条新闻")
        elif news_count > 0:
            score += 10
            detail_parts.append(f"获取到{news_count}条新闻")
        if has_linkedin:
            score += 15
            detail_parts.append("获取到LinkedIn页面")

        # Industry detection is done by LLM, so we give base points
        score += 10  # Base confidence

        if score >= 80:
            level = "高"
        elif score >= 50:
            level = "中"
        else:
            level = "低"

        missing = []
        if not has_website:
            missing.append("官网内容")
        if news_count < 3:
            missing.append("新闻信息")
        if not has_linkedin:
            missing.append("LinkedIn页面")

        detail = "、".join(detail_parts) if detail_parts else "信息来源较少"
        if missing:
            detail += f"。未获取到：{'、'.join(missing)}"

        return {"score": min(score, 100), "level": level, "detail": detail}
