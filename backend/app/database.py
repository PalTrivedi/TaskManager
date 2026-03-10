from __future__ import annotations

from supabase import Client, create_client

try:
    from .config import settings
except ImportError:
    from config import settings

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        if not settings.supabase_url or not settings.supabase_service_key:
            raise RuntimeError(
                "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY."
            )
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client


def init_db() -> None:
    # Touch Supabase once to surface connectivity/auth issues early.
    client = get_client()
    client.table("tasks").select("id").limit(1).execute()
