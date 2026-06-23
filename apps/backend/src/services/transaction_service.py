"""
Transaction business logic layer.
"""
from src.core.supabase import get_supabase
from src.schemas.transaction import TransactionCreate, TransactionUpdate
import uuid
from datetime import datetime, timezone


class TransactionService:
    @staticmethod
    async def list(user_id: str, limit: int = 50, offset: int = 0) -> dict:
        sb = get_supabase()
        result = (
            sb.table("transactions")
            .select("*", count="exact")
            .eq("user_id", user_id)
            .order("date", desc=True)
            .limit(limit)
            .offset(offset)
            .execute()
        )
        return {"items": result.data, "total": result.count or 0, "limit": limit, "offset": offset}

    @staticmethod
    async def create(user_id: str, data: TransactionCreate) -> dict:
        sb = get_supabase()
        now = datetime.now(timezone.utc).isoformat()
        row = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            **data.model_dump(),
            "created_at": now,
            "updated_at": now,
        }
        result = sb.table("transactions").insert(row).execute()
        return result.data[0]

    @staticmethod
    async def get(tx_id: str, user_id: str) -> dict | None:
        sb = get_supabase()
        result = sb.table("transactions").select("*").eq("id", tx_id).eq("user_id", user_id).execute()
        return result.data[0] if result.data else None

    @staticmethod
    async def update(tx_id: str, user_id: str, data: TransactionUpdate) -> dict:
        sb = get_supabase()
        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = sb.table("transactions").update(updates).eq("id", tx_id).eq("user_id", user_id).execute()
        return result.data[0]

    @staticmethod
    async def delete(tx_id: str, user_id: str) -> None:
        sb = get_supabase()
        sb.table("transactions").delete().eq("id", tx_id).eq("user_id", user_id).execute()
