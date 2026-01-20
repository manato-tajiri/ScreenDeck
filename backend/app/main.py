from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    auth_router,
    stores_router,
    areas_router,
    devices_router,
    campaigns_router,
    media_router,
    player_router,
    reports_router,
)

app = FastAPI(
    title=settings.app_name,
    description="Digital Signage Advertisement Delivery System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(stores_router, prefix=settings.api_v1_prefix)
app.include_router(areas_router, prefix=settings.api_v1_prefix)
app.include_router(devices_router, prefix=settings.api_v1_prefix)
app.include_router(campaigns_router, prefix=settings.api_v1_prefix)
app.include_router(media_router, prefix=settings.api_v1_prefix)
app.include_router(player_router, prefix=settings.api_v1_prefix)
app.include_router(reports_router, prefix=settings.api_v1_prefix)


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
