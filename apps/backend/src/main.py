"""
Nekofi FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.v1.endpoints import transactions, budgets, ai, users, storage
from src.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    print(f"🐱 Nekofi Backend starting — env: {settings.APP_ENV}")
    yield
    print("🐱 Nekofi Backend shutting down")


app = FastAPI(
    title="Nekofi API",
    description="AI-powered budget tracker backend",
    version="1.0.0",
    docs_url="/api/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/api/redoc" if settings.APP_ENV != "production" else None,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
API_PREFIX = "/api/v1"
app.include_router(users.router, prefix=API_PREFIX, tags=["users"])
app.include_router(transactions.router, prefix=API_PREFIX, tags=["transactions"])
app.include_router(budgets.router, prefix=API_PREFIX, tags=["budgets"])
app.include_router(ai.router, prefix=API_PREFIX, tags=["ai"])
app.include_router(storage.router, prefix=API_PREFIX, tags=["storage"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "nekofi"}
