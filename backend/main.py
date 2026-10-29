import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import PORT, FRONTEND_ORIGIN
from database import init_db_indexes

# Import all API routers
from routes.auth_routes import router as auth_router
from routes.settings_routes import router as settings_router
from routes.inventory_routes import router as inventory_router
from routes.invoice_routes import router as invoice_router
from routes.pdf_routes import router as pdf_router
from routes.sms_routes import router as sms_router
from routes.dashboard_routes import router as dashboard_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure MongoDB indexes
    init_db_indexes()
    yield

app = FastAPI(
    title="HisabKitab API",
    description="Backend REST API for HisabKitab — Billing, Inventory & Business Management System",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for Vite React frontend
origins = [
    FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

# Register routes
app.include_router(auth_router)
app.include_router(settings_router)
app.include_router(inventory_router)
app.include_router(invoice_router)
app.include_router(pdf_router)
app.include_router(sms_router)
app.include_router(dashboard_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "HisabKitab Backend Engine",
        "database": "MongoDB Community Connected"
    }

# Mount frontend/dist for single-service production deployment (e.g. Render)
import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles

frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
