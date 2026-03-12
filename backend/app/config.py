from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Task Manager API"
    app_env: str = "development"
    debug: bool = True
    supabase_url: str = ""
    supabase_service_key: str = ""
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def allowed_origin_regex(self) -> str:
        # Allow Vercel production and preview deployments without forcing exact env matches.
        return r"^https://([a-zA-Z0-9-]+\.)?vercel\.app$"


settings = Settings()
