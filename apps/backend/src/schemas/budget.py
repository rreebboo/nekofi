from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


class BudgetBase(BaseModel):
    name: str
    category: str
    amount: float = Field(gt=0)
    currency: str = Field(default="PHP", max_length=3)
    period: Literal["weekly", "monthly", "yearly"]
    start_date: str
    color: str = "#7C6BFF"
    emoji: str = "💰"


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = Field(default=None, gt=0)
    period: Optional[Literal["weekly", "monthly", "yearly"]] = None
    color: Optional[str] = None
    emoji: Optional[str] = None


class BudgetRead(BudgetBase):
    id: str
    user_id: str
    spent: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BudgetListResponse(BaseModel):
    items: list[BudgetRead]
    total: int
