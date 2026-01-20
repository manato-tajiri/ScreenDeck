from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from typing import Optional, List


class PlaybackLogBase(BaseModel):
    media_id: UUID
    campaign_id: UUID
    played_at: datetime


class PlaybackLogCreate(PlaybackLogBase):
    device_id: UUID


class PlaybackLogBatchCreate(BaseModel):
    logs: List[PlaybackLogCreate]


class PlaybackLogResponse(PlaybackLogBase):
    id: UUID
    device_id: UUID
    synced_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
