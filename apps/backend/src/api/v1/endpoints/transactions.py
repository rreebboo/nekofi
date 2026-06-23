"""
Transactions CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from src.core.auth import get_current_user
from src.schemas.transaction import (
    TransactionCreate, TransactionRead, TransactionUpdate, TransactionListResponse
)
from src.services.transaction_service import TransactionService

router = APIRouter(prefix="/transactions")


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    user=Depends(get_current_user),
):
    return await TransactionService.list(user_id=user["id"], limit=limit, offset=offset)


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: TransactionCreate,
    user=Depends(get_current_user),
):
    return await TransactionService.create(user_id=user["id"], data=body)


@router.get("/{tx_id}", response_model=TransactionRead)
async def get_transaction(tx_id: str, user=Depends(get_current_user)):
    tx = await TransactionService.get(tx_id=tx_id, user_id=user["id"])
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.patch("/{tx_id}", response_model=TransactionRead)
async def update_transaction(
    tx_id: str,
    body: TransactionUpdate,
    user=Depends(get_current_user),
):
    return await TransactionService.update(tx_id=tx_id, user_id=user["id"], data=body)


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(tx_id: str, user=Depends(get_current_user)):
    await TransactionService.delete(tx_id=tx_id, user_id=user["id"])
