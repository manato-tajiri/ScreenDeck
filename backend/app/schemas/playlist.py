from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from typing import List

from app.models.media import MediaType


class PlaylistItem(BaseModel):
    media_id: UUID
    campaign_id: UUID
    url: str
    type: MediaType
    duration_seconds: int
    filename: str


class PlaylistResponse(BaseModel):
    version: str  # Timestamp or hash for cache invalidation
    items: List[PlaylistItem]
    generated_at: datetime
