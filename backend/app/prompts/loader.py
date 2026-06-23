from datetime import date
from pathlib import Path

_PROMPTS_DIR = Path(__file__).parent
_cache: dict[str, str] = {}


def load_prompt(name: str) -> str:
    if name not in _cache:
        filepath = _PROMPTS_DIR / f"{name}.txt"
        if not filepath.exists():
            raise FileNotFoundError(f"Prompt file not found: {filepath}")
        raw = filepath.read_text(encoding="utf-8")
        # 动态注入当前日期，不用写死年份
        today = date.today()
        raw = raw.replace("{today}", today.strftime("%Y年%m月%d日"))
        _cache[name] = raw
    return _cache[name]

