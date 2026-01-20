from app.routers.auth import router as auth_router
from app.routers.stores import router as stores_router
from app.routers.areas import router as areas_router
from app.routers.devices import router as devices_router
from app.routers.campaigns import router as campaigns_router
from app.routers.media import router as media_router
from app.routers.player import router as player_router
from app.routers.reports import router as reports_router

__all__ = [
    "auth_router",
    "stores_router",
    "areas_router",
    "devices_router",
    "campaigns_router",
    "media_router",
    "player_router",
    "reports_router",
]
