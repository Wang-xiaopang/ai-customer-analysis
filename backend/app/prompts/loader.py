from pathlib import Path

_PROMPTS_DIR = Path(__file__).parent

_cache: dict[str, str] = {}


def load_prompt(name: str) -> str:
    if name not in _cache:
        filepath = _PROMPTS_DIR / f"{name}.txt"
        if not filepath.exists():
            raise FileNotFoundError(f"Prompt file not found: {filepath}")
        _cache[name] = filepath.read_text(encoding="utf-8")
    return _cache[name]
