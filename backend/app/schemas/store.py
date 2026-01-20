from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from typing import Optional


class StoreBase(BaseModel):
    name: str
    code: str


class StoreCreate(StoreBase):
    pass


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    is_active: Optional[bool] = None


class StoreResponse(StoreBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
