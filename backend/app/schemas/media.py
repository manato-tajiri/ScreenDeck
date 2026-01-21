from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional, List

from app.models.media import MediaType


class MediaBase(BaseModel):
    filename: str
    type: MediaType
    duration_seconds: int = Field(default=10, ge=1)
    sort_order: int = 0


class MediaCreate(MediaBase):
    campaign_id: UUID
    gcs_path: str
    gcs_url: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None


class MediaUpdate(BaseModel):
    duration_seconds: Optional[int] = Field(default=None, ge=1)
    sort_order: Optional[int] = None


class MediaResponse(MediaBase):
    id: UUID
    campaign_id: UUID
    gcs_path: str
    gcs_url: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MediaReorderRequest(BaseModel):
    """メディアの並び順更新リクエスト"""
    media_ids: List[UUID]
