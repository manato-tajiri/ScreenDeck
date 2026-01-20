import uuid
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.device import Device, DeviceStatus
from app.models.area import Area
from app.models.user import User, UserRole
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse, DeviceRegister
from app.dependencies import get_current_user, get_current_admin, get_current_staff_or_admin

router = APIRouter(prefix="/devices", tags=["devices"])


@router.get("", response_model=List[DeviceResponse])
async def list_devices(
    store_id: Optional[UUID] = Query(None),
    area_id: Optional[UUID] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_or_admin)
):
    query = db.query(Device)

    # Staff can only see devices in their store
    if current_user.role == UserRole.STAFF:
        if current_user.store_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff user not assigned to a store",
            )
        # Join with Area to filter by store
        query = query.join(Area).filter(Area.store_id == current_user.store_id)
    elif store_id:
        query = query.join(Area).filter(Area.store_id == store_id)

    if area_id:
        query = query.filter(Device.area_id == area_id)

    devices = query.offset(skip).limit(limit).all()
    return devices


@router.post("/register", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def register_device(
    device_data: DeviceRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_or_admin)
):
    # Check area exists
    area = db.query(Area).filter(Area.id == device_data.area_id).first()
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Area not found",
        )

    # Staff can only register devices in their store
    if current_user.role == UserRole.STAFF:
        if current_user.store_id != area.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot register device in another store",
            )

    # Generate device code if not provided
    device_code = device_data.device_code or f"DEV-{uuid.uuid4().hex[:8].upper()}"

    # Check if device code already exists
    existing = db.query(Device).filter(Device.device_code == device_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device code already exists",
        )

    device = Device(
        device_code=device_code,
        area_id=device_data.area_id,
        status=DeviceStatus.UNKNOWN,
        registered_at=datetime.utcnow(),
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.post("/register/qr", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def register_device_via_qr(
    device_data: DeviceRegister,
    db: Session = Depends(get_db),
):
    """Public endpoint for device registration via QR code (no authentication required)."""
    # Check area exists and is active
    area = db.query(Area).filter(Area.id == device_data.area_id, Area.is_active == True).first()
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Area not found or inactive",
        )

    # Generate device code if not provided
    device_code = device_data.device_code or f"DEV-{uuid.uuid4().hex[:8].upper()}"

    # Check if device code already exists
    existing = db.query(Device).filter(Device.device_code == device_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device code already exists",
        )

    device = Device(
        device_code=device_code,
        area_id=device_data.area_id,
        status=DeviceStatus.UNKNOWN,
        registered_at=datetime.utcnow(),
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_or_admin)
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    # Staff can only view devices in their store
    if current_user.role == UserRole.STAFF:
        area = db.query(Area).filter(Area.id == device.area_id).first()
        if area and area.store_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot view device in another store",
            )

    return device


@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: UUID,
    device_data: DeviceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_or_admin)
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    # Get current area's store
    current_area = db.query(Area).filter(Area.id == device.area_id).first()

    # Staff can only update devices in their store
    if current_user.role == UserRole.STAFF:
        if current_area and current_area.store_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot update device in another store",
            )

    update_data = device_data.model_dump(exclude_unset=True)

    # If changing area, validate the new area
    if "area_id" in update_data:
        new_area = db.query(Area).filter(Area.id == update_data["area_id"]).first()
        if not new_area:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="New area not found",
            )
        # Staff can only move devices within their store
        if current_user.role == UserRole.STAFF:
            if new_area.store_id != current_user.store_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot move device to another store",
                )

    for key, value in update_data.items():
        setattr(device, key, value)

    db.commit()
    db.refresh(device)
    return device


@router.put("/{device_id}/area", response_model=DeviceResponse)
async def update_device_area(
    device_id: UUID,
    area_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_or_admin)
):
    """Convenience endpoint for staff to move device to another area."""
    device_data = DeviceUpdate(area_id=area_id)
    return await update_device(device_id, device_data, db, current_user)


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(
    device_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    db.delete(device)
    db.commit()
