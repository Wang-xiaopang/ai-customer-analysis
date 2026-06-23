"""使用 Bing 搜索获取真实企业信息，国内直连、免费"""
import asyncio
import logging
import re
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger("uvicorn")


class SearchService:
    """Bing 搜索企业信息（免费，无需 API Key，国内可用）"""

    def __init__(self):
        pass

    def _detect_input_type(self, text: str) -> str:
        text = text.strip()
        if re.match(r"^https?://", text):
            return "url"
        if len(text) > 100:
            return "description"
        return "company_name"

    async def _bing_search(self, query: str, num: int = 8) -> list[dict]:
        """搜索 Bing 并解析结果"""
        results = []
        try:
            url = f"https://www.bing.com/search?q={query}&count={num}&setlang=zh-cn"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url, headers=headers, follow_redirects=True)
                if resp.status_code != 200:
                    logger.warning(f"Bing 返回 {resp.status_code}")
                    return results

                soup = BeautifulSoup(resp.text, "html.parser")
                for item in soup.select("li.b_algo"):
                    title_el = item.select_one("h2 a")
                    snippet_el = item.select_one(".b_caption p")
                    if title_el:
                        results.append({
                            "url": title_el.get("href", ""),
                            "title": title_el.get_text(strip=True),
                            "snippet": snippet_el.get_text(strip=True) if snippet_el else "",
                        })
                        if len(results) >= num:
                            break
        except Exception as e:
            logger.warning(f"Bing 搜索失败: {e}")

        return results

    async def search(self, company_input: str) -> dict:
        input_type = self._detect_input_type(company_input)

        if input_type == "url":
            website = company_input.strip()
            company_name = website
        else:
            website = None
            company_name = company_input.strip()

        logger.info(f"Bing 搜索: {company_name}")

        # 并行搜索
        general_task = self._bing_search(f"{company_name} 公司 官网 简介", num=8)
        jobs_task = self._bing_search(f"{company_name} 招聘 2025", num=3)

        general_results, jobs_results = await asyncio.gather(general_task, jobs_task)
        all_results = general_results + jobs_results

        logger.info(f"搜索完成: {len(all_results)} 条结果")

        # 识别官网
        social_domains = ["linkedin", "facebook", "wikipedia", "zhihu", "weibo",
                          "twitter", "instagram", "youtube", "qcc", "tianyancha"]
        official_site = website
        if not official_site:
            for r in all_results:
                u = r["url"].lower()
                if u and not any(d in u for d in social_domains):
                    match = re.match(r"https?://([^/]+)", r["url"])
                    if match:
                        official_site = f"https://{match.group(1)}"
                        break

        # 抓取官网内容
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
                pass

        # 检查招聘
        has_jobs = any("招聘" in r["url"] or "career" in r["url"].lower() or "job" in r["url"].lower()
                       for r in jobs_results)
        has_linkedin = any("linkedin.com/company" in r["url"].lower() for r in all_results)

        # 置信度
        score = 10
        if has_website: score += 40
        if len(all_results) >= 5: score += 30
        elif len(all_results) >= 3: score += 20
        elif len(all_results) > 0: score += 10
        if has_linkedin: score += 10
        if has_jobs: score += 10
        level = "高" if score >= 80 else "中" if score >= 50 else "低"

        return {
            "company_name": company_name,
            "website": official_site or "",
            "industry": "",
            "website_content": website_content,
            "news": all_results[:15],
            "data_confidence": {
                "score": min(score, 100),
                "level": level,
                "detail": "基于 Bing 实时搜索结果",
            },
        }
