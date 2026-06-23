"""
Gemini AI Service — wraps the Google Generative AI SDK.
"""
import json
import google.generativeai as genai
from src.core.config import settings
from src.core.supabase import get_supabase

genai.configure(api_key=settings.GEMINI_API_KEY)

_model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    system_instruction=(
        "You are Nekofi, a friendly and knowledgeable AI financial assistant. "
        "You help users manage their personal finances, track spending, set budgets, "
        "and make smarter money decisions. Keep responses concise, actionable, and encouraging. "
        "Use simple language and avoid jargon."
    ),
)

_vision_model = genai.GenerativeModel("gemini-1.5-flash")


class GeminiService:
    @staticmethod
    async def chat(user_id: str, message: str) -> str:
        """Send a chat message and return the AI reply."""
        # Optionally, fetch user's recent transactions for context
        supabase = get_supabase()
        txs = (
            supabase.table("transactions")
            .select("type, amount, category, description, date")
            .eq("user_id", user_id)
            .order("date", desc=True)
            .limit(10)
            .execute()
        )
        context = ""
        if txs.data:
            context = f"\nUser's recent transactions: {json.dumps(txs.data[:5], indent=2)}"

        response = _model.generate_content(f"{context}\n\nUser: {message}")
        return response.text

    @staticmethod
    async def daily_insight(user_id: str) -> str:
        """Generate a daily financial insight based on the user's spending."""
        supabase = get_supabase()
        txs = (
            supabase.table("transactions")
            .select("type, amount, category")
            .eq("user_id", user_id)
            .order("date", desc=True)
            .limit(30)
            .execute()
        )
        if not txs.data:
            return "Start tracking your expenses today to unlock personalized AI insights! 🐱"

        prompt = (
            f"Here are the user's recent transactions:\n{json.dumps(txs.data, indent=2)}\n\n"
            "Give a single, concise, friendly financial insight (1-2 sentences max) "
            "based on this data. Be specific and actionable."
        )
        response = _model.generate_content(prompt)
        return response.text

    @staticmethod
    async def scan_receipt(image_bytes: bytes, mime_type: str) -> dict:
        """Extract transaction data from a receipt image using Gemini Vision."""
        prompt = """
        Analyze this receipt image and extract:
        - merchant: store/restaurant name
        - amount: total amount (number only, no currency symbol)
        - date: date of purchase in YYYY-MM-DD format
        - category: one of [food, transport, shopping, entertainment, health, utilities, other]
        - raw_text: the full text you can read from the receipt

        Respond in valid JSON format only.
        """
        part = {"mime_type": mime_type, "data": image_bytes}
        response = _vision_model.generate_content([prompt, part])
        try:
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("```")[1].removeprefix("json").strip()
            data = json.loads(text)
        except Exception:
            data = {"merchant": None, "amount": None, "date": None, "category": None, "raw_text": response.text}
        return data
