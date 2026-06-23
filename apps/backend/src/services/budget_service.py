"""
Budget business logic layer.
"""
from src.core.supabase import get_supabase
from src.schemas.budget import BudgetCreate, BudgetUpdate
import uuid
from datetime import datetime, timezone


class BudgetService:
    @staticmethod
    async def list(user_id: str) -> dict:
        sb = get_supabase()
        result = sb.table("budgets").select("*", count="exact").eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"items": result.data, "total": result.count or 0}

    @staticmethod
    async def create(user_id: str, data: BudgetCreate) -> dict:
        sb = get_supabase()
        now = datetime.now(timezone.utc).isoformat()
        row = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "spent": 0.0,
            **data.model_dump(),
            "created_at": now,
            "updated_at": now,
        }
        result = sb.table("budgets").insert(row).execute()
        return result.data[0]

    @staticmethod
    async def get(budget_id: str, user_id: str) -> dict | None:
        sb = get_supabase()
        result = sb.table("budgets").select("*").eq("id", budget_id).eq("user_id", user_id).execute()
        return result.data[0] if result.data else None

    @staticmethod
    async def update(budget_id: str, user_id: str, data: BudgetUpdate) -> dict:
        sb = get_supabase()
        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = sb.table("budgets").update(updates).eq("id", budget_id).eq("user_id", user_id).execute()
        return result.data[0]

    @staticmethod
    async def delete(budget_id: str, user_id: str) -> None:
        sb = get_supabase()
        sb.table("budgets").delete().eq("id", budget_id).eq("user_id", user_id).execute()
