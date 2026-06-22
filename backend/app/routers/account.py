# ai-customer-analysis/backend/app/routers/account.py
from fastapi import APIRouter

router = APIRouter(prefix="/api/account", tags=["account"])


@router.get("")
async def get_account():
    # V1: static response. No user auth yet.
    return {
        "plan": "free",
        "daily_limit": 3,
        "bonus_remaining": 0,
        "email": None,
    }
