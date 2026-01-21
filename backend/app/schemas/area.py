from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel
from typing import Optional, List


class AreaBase(BaseModel):
    name: str
    code: str


class AreaCreate(AreaBase):
    pass


class AreaUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    is_active: Optional[bool] = None


class AreaResponse(AreaBase):
    id: UUID
    store_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Campaign assignment related schemas
class CampaignInfo(BaseModel):
    """配信中のキャンペーン情報"""
    id: UUID
    name: str
    start_date: date
    end_date: date
    is_active: bool

    class Config:
        from_attributes = True


class AreaCampaignAssignment(BaseModel):
    """エリアごとのキャンペーン割り当て情報"""
    area_id: UUID
    area_name: str
    area_code: str
    store_id: UUID
    store_name: str
    assigned_campaigns: List[CampaignInfo]
    has_conflict: bool  # 指定期間と重複するか
    conflicting_campaigns: List[CampaignInfo]  # 重複しているキャンペーン


class AreaCampaignAssignmentResponse(BaseModel):
    """全エリアのキャンペーン割り当て情報のレスポンス"""
    areas: List[AreaCampaignAssignment]
