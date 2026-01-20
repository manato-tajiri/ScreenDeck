import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    weight = Column(Integer, default=1, nullable=False)  # 1-100
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    media = relationship("Media", back_populates="campaign", cascade="all, delete-orphan")
    campaign_areas = relationship("CampaignArea", back_populates="campaign", cascade="all, delete-orphan")
    playback_logs = relationship("PlaybackLog", back_populates="campaign")


class CampaignArea(Base):
    __tablename__ = "campaign_areas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    area_id = Column(UUID(as_uuid=True), ForeignKey("areas.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    campaign = relationship("Campaign", back_populates="campaign_areas")
    area = relationship("Area", back_populates="campaign_areas")
