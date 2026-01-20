import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class PlaybackLog(Base):
    __tablename__ = "playback_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False)
    media_id = Column(UUID(as_uuid=True), ForeignKey("media.id"), nullable=False)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    played_at = Column(DateTime, nullable=False)
    synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    device = relationship("Device", back_populates="playback_logs")
    media = relationship("Media", back_populates="playback_logs")
    campaign = relationship("Campaign", back_populates="playback_logs")
