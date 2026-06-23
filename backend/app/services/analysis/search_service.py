"""使用 Google 搜索获取真实企业信息，免费、准确"""
import asyncio
import logging
import re
import httpx
from googlesearch import search as google_search

logger = logging.getLogger("uvicorn")


class SearchService:
    """Google 搜索企业信息（免费，无需 API Key）"""

    def __init__(self):
        pass

    def _detect_input_type(self, text: str) -> str:
        text = text.strip()
        if re.match(r"^https?://", text):
            return "url"
        if len(text) > 100:
            return "description"
        return "company_name"

    async def _do_search(self, query: str, num: int = 8) -> list[dict]:
        """在线程池中执行同步 Google 搜索"""
        loop = asyncio.get_running_loop()

        def _search():
            results = []
            try:
                for url in google_search(query, num_results=num, lang="zh", sleep_interval=1):
                    results.append({"url": url, "title": "", "snippet": ""})
            except Exception:
                pass
            return results

        try:
            return await asyncio.wait_for(loop.run_in_executor(None, _search), timeout=10)
        except asyncio.TimeoutError:
            logger.warning(f"Google 搜索超时: {query}")
            return []

    async def search(self, company_input: str) -> dict:
        input_type = self._detect_input_type(company_input)

        if input_type == "url":
            website = company_input.strip()
            company_name = website
        else:
            website = None
            company_name = company_input.strip()

        logger.info(f"Google 搜索: {company_name}")

        # 并行搜索多个维度
        urls_task = self._do_search(f"{company_name} 官网", num=5)
        news_task = self._do_search(f"{company_name} 公司 简介", num=5)
        jobs_task = self._do_search(f"{company_name} 招聘 2025", num=3)

        url_results, news_results, jobs_results = await asyncio.gather(
            urls_task, news_task, jobs_task
        )

        # 合并去重
        all_urls = []
        seen = set()
        for r in url_results + news_results + jobs_results:
            u = r["url"]
            if u not in seen:
                seen.add(u)
                all_urls.append({"url": u, "title": r["title"], "snippet": r["snippet"]})

        logger.info(f"搜索完成: {len(all_urls)} 个唯一结果")

        # 识别官网（排除社媒/聚合站）
        social = ["linkedin", "facebook", "wikipedia", "zhihu", "weibo", "twitter",
                   "instagram", "youtube", "tiktok", "xiaohongshu", "qcc.com",
                   "tianyancha", "企查查", "天眼查"]
        official_site = website
        if not official_site:
            for r in all_urls:
                u = r["url"].lower()
                if not any(s in u for s in social):
                    match = re.match(r"https?://([^/]+)", r["url"])
                    if match:
                        official_site = f"https://{match.group(1)}"
                        break

        # 尝试抓取官网内容
        website_content = ""
        has_website = False
        if official_site:
            try:
                async with httpx.AsyncClient(timeout=8) as client:
                    resp = await client.get(official_site, follow_redirects=True)
                    html = resp.text
                    clean = re.sub(r"<[^>]+>", " ", html)
                    clean = re.sub(r"\s+", " ", clean)
                    website_content = clean[:3000]
                    has_website = True
            except Exception:
                website_content = ""

        # 检查招聘信息
        has_jobs = False
        for r in jobs_results:
            jobs_terms = ["招聘", "career", "jobs", "加入我们", "校招", "社招"]
            if any(t in r["url"].lower() for t in jobs_terms):
                has_jobs = True
                break

        # 检查 LinkedIn
        has_linkedin = any("linkedin.com/company" in r["url"].lower() for r in all_urls)

        # 计算置信度
        score = 10  # base
        parts = []
        if has_website:
            score += 40
            parts.append("获取到官网内容")
        if len(all_urls) >= 5:
            score += 30
            parts.append(f"搜索到{len(all_urls)}个结果")
        elif len(all_urls) >= 3:
            score += 20
            parts.append(f"搜索到{len(all_urls)}个结果")
        elif len(all_urls) > 0:
            score += 10
            parts.append(f"搜索到{len(all_urls)}个结果")
        if has_linkedin:
            score += 10
            parts.append("获取到LinkedIn")
        if has_jobs:
            score += 10
            parts.append("检测到招聘信息")

        level = "高" if score >= 80 else "中" if score >= 50 else "低"

        return {
            "company_name": company_name,
            "website": official_site or "",
            "industry": "",
            "website_content": website_content,
            "news": all_urls[:15],
            "data_confidence": {
                "score": min(score, 100),
                "level": level,
                "detail": "基于 Google 搜索结果",
            },
        }
