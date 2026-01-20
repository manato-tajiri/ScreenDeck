from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from typing import Optional


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
