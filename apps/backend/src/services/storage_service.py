"""
Supabase Storage service — handles receipt file uploads.
"""
import uuid
from src.core.supabase import get_supabase

BUCKET_NAME = "receipts"


class StorageService:
    @staticmethod
    async def upload_receipt(
        user_id: str,
        file_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> dict:
        sb = get_supabase()
        ext = filename.split(".")[-1] if "." in filename else "jpg"
        path = f"{user_id}/{uuid.uuid4()}.{ext}"

        sb.storage.from_(BUCKET_NAME).upload(
            path=path,
            file=file_bytes,
            file_options={"content-type": content_type},
        )

        public_url = sb.storage.from_(BUCKET_NAME).get_public_url(path)
        return {"url": public_url, "path": path}
