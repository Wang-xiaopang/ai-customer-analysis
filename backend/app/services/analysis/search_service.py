"""Bing 搜索 + 公司名智能解析，小公司也能产出有价值的情报"""
import asyncio
import logging
import re
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger("uvicorn")

# 从公司名推断行业
NAME_PATTERNS = [
    (r"贸易|商贸|进出口|外贸|供应链", "贸易/进出口"),
    (r"科技|信息技术|软件|网络|互联|数据|智能|AI|数字", "科技/互联网"),
    (r"制造|机械|设备|电子|电器|五金|模具|加工|生产", "制造业"),
    (r"食品|餐饮|饮料|酒|茶|烘焙|农产品", "食品/餐饮"),
    (r"建筑|装修|装饰|工程|建材|房地产|置业", "建筑/房地产"),
    (r"物流|运输|快递|货运|配送|仓储|供应链", "物流/运输"),
    (r"教育|培训|咨询|顾问|人力|HR", "教育/咨询"),
    (r"医药|医疗|药|生物|器械|健康|诊断", "医疗/医药"),
    (r"金融|投资|基金|证券|保险|理财|资本", "金融/保险"),
    (r"广告|传媒|文化|设计|影视|娱乐|旅游|酒店", "文化/传媒"),
    (r"汽车|新能源|光伏|储能|充电|电池", "新能源/汽车"),
    (r"服装|纺织|服饰|鞋|箱包|化妆品|日化|家居", "消费品/零售"),
]


class SearchService:
    """搜索 + 公司名解析"""

    def __init__(self):
        pass

    def _parse_company_name(self, name: str) -> dict:
        """从公司名推断基本信息，小公司也有用"""
        for pattern, industry in NAME_PATTERNS:
            if re.search(pattern, name):
                return {"industry": industry, "name_hint": f"公司名含关键词，推测为{industry}"}
        return {"industry": "企业服务/综合", "name_hint": "无法从名称推断行业"}

    def _detect_input_type(self, text: str) -> str:
        text = text.strip()
        if re.match(r"^https?://", text):
            return "url"
        if len(text) > 100:
            return "description"
        return "company_name"

    async def _bing_search(self, query: str, num: int = 5) -> list[dict]:
        results = []
        try:
            url = f"https://www.bing.com/search?q={query}&count={num}"
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.get(url, headers=headers, follow_redirects=True)
                if resp.status_code != 200:
                    return results
                soup = BeautifulSoup(resp.text, "html.parser")
                for item in soup.select("li.b_algo"):
                    a = item.select_one("h2 a")
                    p = item.select_one(".b_caption p")
                    if a:
                        results.append({
                            "url": a.get("href", ""),
                            "title": a.get_text(strip=True),
                            "snippet": p.get_text(strip=True) if p else "",
                        })
                        if len(results) >= num:
                            break
        except Exception:
            pass
        return results

    async def search(self, company_input: str) -> dict:
        input_type = self._detect_input_type(company_input)
        website = company_input.strip() if input_type == "url" else None
        company_name = company_input.strip()

        # 解析公司名
        parsed = self._parse_company_name(company_name)
        logger.info(f"公司名解析: {company_name} → {parsed['industry']}")

        # 轻量搜索
        logger.info(f"Bing 搜索: {company_name}")
        results = await self._bing_search(f"{company_name} 公司", num=5)

        # 识别官网
        social = ["linkedin", "facebook", "wikipedia", "zhihu", "weibo", "qcc", "tianyancha"]
        official_site = website
        if not official_site:
            for r in results:
                u = r["url"].lower()
                if u and not any(d in u for d in social):
                    m = re.match(r"https?://([^/]+)", r["url"])
                    if m:
                        official_site = f"https://{m.group(1)}"
                        break

        # 抓官网
        website_content = ""
        if official_site:
            try:
                async with httpx.AsyncClient(timeout=6) as client:
                    resp = await client.get(official_site, follow_redirects=True)
                    clean = re.sub(r"<[^>]+>", " ", resp.text)
                    clean = re.sub(r"\s+", " ", clean)
                    website_content = clean[:2000]
            except Exception:
                pass

        # 置信度：有名解析兜底，永远不会是 0
        score = 30  # 公司名解析给 30 分基础分
        if website_content:
            score += 30
        if len(results) >= 3:
            score += 25
        elif len(results) > 0:
            score += 15
        level = "高" if score >= 70 else "中" if score >= 40 else "低"

        return {
            "company_name": company_name,
            "website": official_site or "",
            "industry": parsed["industry"],
            "website_content": website_content,
            "news": results,
            "data_confidence": {
                "score": min(score, 100),
                "level": level,
                "detail": f"公司名解析: {parsed['name_hint']}。Bing 搜索到 {len(results)} 条结果。" + ("获取到官网内容。" if website_content else "未获取到官网。"),
            },
        }
