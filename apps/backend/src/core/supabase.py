from supabase import create_client, Client
from src.core.config import settings

_client: Client | None = None


def get_supabase() -> Client:
    """Return a singleton Supabase admin client (service role)."""
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _client
