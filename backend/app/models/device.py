import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class DeviceStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    UNKNOWN = "unknown"


class Device(Base):
    __tablename__ = "devices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_code = Column(String(100), unique=True, nullable=False, index=True)
    area_id = Column(UUID(as_uuid=True), ForeignKey("areas.id"), nullable=False)
    name = Column(String(255), nullable=True)
    status = Column(Enum(DeviceStatus, values_callable=lambda x: [e.value for e in x]), default=DeviceStatus.UNKNOWN, nullable=False)
    last_sync_at = Column(DateTime, nullable=True)
    registered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    area = relationship("Area", back_populates="devices")
    playback_logs = relationship("PlaybackLog", back_populates="device", cascade="all, delete-orphan")
