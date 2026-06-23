"""
Receipt upload endpoint — stores files in Supabase Storage.
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from src.core.auth import get_current_user
from src.services.storage_service import StorageService

router = APIRouter(prefix="/storage")


class UploadResponse(BaseModel):
    url: str
    path: str


@router.post("/receipts", response_model=UploadResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    """Upload a receipt image to Supabase Storage and return the public URL."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are accepted.")
    image_bytes = await file.read()
    result = await StorageService.upload_receipt(
        user_id=user["id"],
        file_bytes=image_bytes,
        filename=file.filename or "receipt.jpg",
        content_type=file.content_type,
    )
    return result
