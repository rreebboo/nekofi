"""
Budget CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from src.core.auth import get_current_user
from src.schemas.budget import BudgetCreate, BudgetRead, BudgetUpdate, BudgetListResponse
from src.services.budget_service import BudgetService

router = APIRouter(prefix="/budgets")


@router.get("", response_model=BudgetListResponse)
async def list_budgets(user=Depends(get_current_user)):
    return await BudgetService.list(user_id=user["id"])


@router.post("", response_model=BudgetRead, status_code=status.HTTP_201_CREATED)
async def create_budget(body: BudgetCreate, user=Depends(get_current_user)):
    return await BudgetService.create(user_id=user["id"], data=body)


@router.get("/{budget_id}", response_model=BudgetRead)
async def get_budget(budget_id: str, user=Depends(get_current_user)):
    budget = await BudgetService.get(budget_id=budget_id, user_id=user["id"])
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget


@router.patch("/{budget_id}", response_model=BudgetRead)
async def update_budget(budget_id: str, body: BudgetUpdate, user=Depends(get_current_user)):
    return await BudgetService.update(budget_id=budget_id, user_id=user["id"], data=body)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(budget_id: str, user=Depends(get_current_user)):
    await BudgetService.delete(budget_id=budget_id, user_id=user["id"])
