from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional, List


class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None
    weight: int = Field(default=1, ge=1, le=100)
    start_date: date
    end_date: date


class CampaignCreate(CampaignBase):
    store_id: UUID


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    weight: Optional[int] = Field(default=None, ge=1, le=100)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class CampaignResponse(CampaignBase):
    id: UUID
    store_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CampaignAreaUpdate(BaseModel):
    area_ids: List[UUID]


# Conflict check schemas
class CampaignConflictCheckRequest(BaseModel):
    area_ids: List[UUID]
    start_date: date
    end_date: date
    exclude_campaign_id: Optional[UUID] = None


class CampaignConflictInfo(BaseModel):
    id: UUID
    name: str
    start_date: date
    end_date: date
    is_active: bool

    class Config:
        from_attributes = True


class CampaignConflict(BaseModel):
    area_id: UUID
    area_name: str
    store_name: str
    conflicting_campaign: CampaignConflictInfo


class CampaignConflictCheckResponse(BaseModel):
    has_conflicts: bool
    conflicts: List[CampaignConflict]
