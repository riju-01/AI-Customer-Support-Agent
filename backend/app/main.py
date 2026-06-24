"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database.db import init_db
from .database.seed import seed_database
from .routes.chat import router as chat_router
from .routes.admin import router as admin_router
from .routes.voice import router as voice_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_database()
    yield


app = FastAPI(
    title="AI Customer Support Agent",
    description="E-commerce refund processing agent with LangGraph",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(admin_router)
app.include_router(voice_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "AI Customer Support Agent"}
