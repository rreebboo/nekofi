from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


class DailyInsightResponse(BaseModel):
    insight: str


class ReceiptScanResponse(BaseModel):
    merchant: str | None
    amount: float | None
    date: str | None
    category: str | None
    raw_text: str
