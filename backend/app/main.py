from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db
from app.api.routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Otomatis buat tabel & ekstensi pgvector saat server menyala
    init_db()
    yield

app = FastAPI(
    title="Enterprise Document RAG API",
    description="Sistem RAG Dokumen Kompleks dengan Hybrid Search & Sitasi Halaman",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Nanti bisa dibatasi ke domain Next.js saat production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Enterprise RAG Backend is running"}