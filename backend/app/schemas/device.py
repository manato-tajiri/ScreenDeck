from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from typing import Optional

from app.models.device import DeviceStatus


class DeviceBase(BaseModel):
    name: Optional[str] = None


class DeviceCreate(DeviceBase):
    device_code: str
    area_id: UUID


class DeviceRegister(BaseModel):
    area_id: UUID
    device_code: Optional[str] = None  # If not provided, will be auto-generated


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    area_id: Optional[UUID] = None


class DeviceResponse(DeviceBase):
    id: UUID
    device_code: str
    area_id: UUID
    status: DeviceStatus
    last_sync_at: Optional[datetime] = None
    registered_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
