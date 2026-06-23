"""
AI endpoints — Chat (Gemini), Daily Insight, Receipt OCR.
"""
from fastapi import APIRouter, Depends, UploadFile, File
from src.core.auth import get_current_user
from src.schemas.ai import ChatRequest, ChatResponse, DailyInsightResponse, ReceiptScanResponse
from src.ai.gemini_service import GeminiService

router = APIRouter(prefix="/ai")


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, user=Depends(get_current_user)):
    """Send a message to Gemini and receive a financial-focused reply."""
    reply = await GeminiService.chat(user_id=user["id"], message=body.message)
    return ChatResponse(reply=reply)


@router.get("/daily-insight", response_model=DailyInsightResponse)
async def daily_insight(user=Depends(get_current_user)):
    """Return a short daily AI-generated spending insight for the user."""
    insight = await GeminiService.daily_insight(user_id=user["id"])
    return DailyInsightResponse(insight=insight)


@router.post("/scan-receipt", response_model=ReceiptScanResponse)
async def scan_receipt(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    """Analyze a receipt image with Gemini Vision and extract transaction data."""
    image_bytes = await file.read()
    result = await GeminiService.scan_receipt(image_bytes=image_bytes, mime_type=file.content_type or "image/jpeg")
    return result
