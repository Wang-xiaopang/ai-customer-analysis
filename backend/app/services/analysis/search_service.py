# ai-customer-analysis/backend/app/services/analysis/search_service.py
import re
import asyncio
import httpx
from ddgs import DDGS


class SearchService:
    """Company search using DuckDuckGo (free, no API key required)."""

    def __init__(self):
        pass  # No API key needed

    def _detect_input_type(self, text: str) -> str:
        """Detect if input is URL, company name, or description."""
        text = text.strip()
        if re.match(r"^https?://", text):
            return "url"
        if len(text) > 100:
            return "description"
        return "company_name"

    def _extract_domain(self, url: str) -> str | None:
        match = re.match(r"https?://([^/]+)", url)
        return match.group(1) if match else None

    def _is_social_media(self, url: str) -> bool:
        social_domains = [
            "linkedin.com", "facebook.com", "wikipedia.org",
            "zhihu.com", "weibo.com", "twitter.com", "instagram.com",
            "youtube.com", "tiktok.com", "xiaohongshu.com",
        ]
        return any(d in url.lower() for d in social_domains)

    def _is_jobs_related(self, title: str, body: str) -> bool:
        text = (title + " " + body).lower()
        return any(term in text for term in ["招聘", "career", "jobs", "加入我们", "校招", "社招"])

    async def search(self, company_input: str) -> dict:
        input_type = self._detect_input_type(company_input)

        if input_type == "url":
            website = company_input.strip()
            company_name = website
        else:
            website = None
            company_name = company_input.strip()

        all_news = []
        website_content = ""
        linkedin_found = False
        has_jobs = False

        # Run DuckDuckGo searches in thread pool (DDGS is sync, we run async)
        loop = asyncio.get_running_loop()

        def _search_web(query: str, max_results: int = 8):
            results = []
            try:
                with DDGS() as ddgs:
                    for r in ddgs.text(query, region="wt-wt", max_results=max_results):
                        results.append(r)
            except Exception:
                pass
            return results

        def _search_news(query: str, max_results: int = 5):
            results = []
            try:
                with DDGS() as ddgs:
                    for r in ddgs.news(query, region="wt-wt", max_results=max_results):
                        results.append(r)
            except Exception:
                pass
            return results

        # Search web + news in parallel
        web_query = f"{company_name} 公司 官网" if not website else company_name
        web_results_future = loop.run_in_executor(None, _search_web, web_query, 8)
        news_future = loop.run_in_executor(None, _search_news, f"{company_name}", 5)

        web_results, news_results = await asyncio.gather(web_results_future, news_future)

        # Also search for jobs
        jobs_future = loop.run_in_executor(None, _search_web, f"{company_name} 招聘 2025", 5)
        jobs_results = await jobs_future

        # Process web results
        for r in web_results:
            url = r.get("href", "")
            all_news.append({
                "title": r.get("title", ""),
                "url": url,
                "snippet": r.get("body", ""),
                "date": "",
            })

            # Detect LinkedIn
            if not linkedin_found and "linkedin.com/company" in url.lower():
                linkedin_found = True

            # Detect website from results
            if not website and url and not self._is_social_media(url):
                domain = self._extract_domain(url)
                if domain:
                    website = f"https://{domain}"

            # Check for jobs
            if not has_jobs and self._is_jobs_related(r.get("title", ""), r.get("body", "")):
                has_jobs = True

        # Process news results
        for r in news_results:
            all_news.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "snippet": r.get("body", ""),
                "date": r.get("date", ""),
            })

            if not linkedin_found and "linkedin.com/company" in r.get("url", "").lower():
                linkedin_found = True

            if not has_jobs and self._is_jobs_related(r.get("title", ""), r.get("body", "")):
                has_jobs = True

        # Process jobs results
        for r in jobs_results:
            if self._is_jobs_related(r.get("title", ""), r.get("body", "")):
                has_jobs = True
                # Add jobs-related results to news
                all_news.append({
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", ""),
                    "date": "",
                })

        # Fetch website content
        if website:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(website, follow_redirects=True)
                    html = resp.text
                    clean = re.sub(r"<[^>]+>", " ", html)
                    clean = re.sub(r"\s+", " ", clean)
                    website_content = clean[:3000]
            except Exception:
                website_content = ""

        # Calculate data confidence
        confidence = self._calculate_confidence(
            has_website=bool(website_content),
            news_count=len(all_news),
            has_linkedin=linkedin_found,
            has_jobs=has_jobs,
        )

        return {
            "company_name": company_name,
            "website": website or "",
            "industry": "",
            "website_content": website_content,
            "news": all_news[:15],
            "data_confidence": confidence,
        }

    def _calculate_confidence(
        self, has_website: bool, news_count: int, has_linkedin: bool, has_jobs: bool = False
    ) -> dict:
        score = 0
        detail_parts = []

        if has_website:
            score += 30
            detail_parts.append("获取到官网内容")
        if news_count >= 5:
            score += 30
            detail_parts.append(f"获取到{news_count}条搜索结果")
        elif news_count >= 3:
            score += 20
            detail_parts.append(f"获取到{news_count}条搜索结果")
        elif news_count > 0:
            score += 10
            detail_parts.append(f"获取到{news_count}条搜索结果")
        if has_linkedin:
            score += 15
            detail_parts.append("获取到LinkedIn页面")
        if has_jobs:
            score += 20
            detail_parts.append("检测到招聘信息")

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
            missing.append("搜索信息不足")
        if not has_linkedin:
            missing.append("LinkedIn页面")

        detail = "、".join(detail_parts) if detail_parts else "信息来源较少"
        if missing:
            detail += f"。未获取到：{'、'.join(missing)}"

        return {"score": min(score, 100), "level": level, "detail": detail}
