from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "change-me"

    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str

    GEMINI_API_KEY: str

    CORS_ORIGINS: list[str] = ["http://localhost:8081", "exp://localhost:8081"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
