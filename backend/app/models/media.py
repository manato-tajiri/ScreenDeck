import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, BigInteger, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class MediaType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"


class Media(Base):
    __tablename__ = "media"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    type = Column(Enum(MediaType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    filename = Column(String(255), nullable=False)
    gcs_path = Column(String(500), nullable=False)
    gcs_url = Column(String(1000), nullable=True)
    duration_seconds = Column(Integer, nullable=False, default=10)  # Default 10 seconds
    file_size = Column(BigInteger, nullable=True)
    mime_type = Column(String(100), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    campaign = relationship("Campaign", back_populates="media")
    playback_logs = relationship("PlaybackLog", back_populates="media")
