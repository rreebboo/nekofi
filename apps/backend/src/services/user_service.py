"""
User profile service.
"""
from src.core.supabase import get_supabase


class UserService:
    @staticmethod
    async def get_profile(user_id: str) -> dict | None:
        sb = get_supabase()
        result = sb.table("profiles").select("*").eq("id", user_id).execute()
        return result.data[0] if result.data else None

    @staticmethod
    async def update_profile(user_id: str, data: dict) -> dict:
        sb = get_supabase()
        result = sb.table("profiles").update(data).eq("id", user_id).execute()
        return result.data[0]
