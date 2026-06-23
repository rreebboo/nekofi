from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


class TransactionBase(BaseModel):
    type: Literal["income", "expense", "transfer"]
    amount: float = Field(gt=0)
    currency: str = Field(default="PHP", max_length=3)
    category: str
    description: str
    date: str  # ISO date: YYYY-MM-DD
    budget_id: Optional[str] = None
    receipt_url: Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    receipt_url: Optional[str] = None


class TransactionRead(TransactionBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    items: list[TransactionRead]
    total: int
    limit: int
    offset: int
