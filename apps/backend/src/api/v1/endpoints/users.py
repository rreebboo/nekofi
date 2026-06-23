"""
User profile endpoints.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from src.core.auth import get_current_user
from src.services.user_service import UserService

router = APIRouter(prefix="/users")


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    currency: str | None = None


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    return await UserService.get_profile(user_id=user["id"])


@router.patch("/me")
async def update_me(body: UpdateProfileRequest, user=Depends(get_current_user)):
    return await UserService.update_profile(user_id=user["id"], data=body.model_dump(exclude_none=True))
