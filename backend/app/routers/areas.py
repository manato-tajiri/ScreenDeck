import io
import base64
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
import qrcode

from app.database import get_db
from app.models.store import Store
from app.models.area import Area
from app.models.user import User
from app.schemas.area import AreaCreate, AreaUpdate, AreaResponse
from app.dependencies import get_current_admin
from app.config import settings

router = APIRouter(tags=["areas"])


@router.get("/stores/{store_id}/areas", response_model=List[AreaResponse])
async def list_areas(
    store_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )

    areas = db.query(Area).filter(Area.store_id == store_id).all()
    return areas


@router.post("/stores/{store_id}/areas", response_model=AreaResponse, status_code=status.HTTP_201_CREATED)
async def create_area(
    store_id: UUID,
    area_data: AreaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )

    # Check if code already exists within the store
    existing = db.query(Area).filter(
        Area.store_id == store_id,
        Area.code == area_data.code
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Area code already exists in this store",
        )

    area = Area(store_id=store_id, **area_data.model_dump())
    db.add(area)
    db.commit()
    db.refresh(area)
    return area


@router.get("/areas/{area_id}", response_model=AreaResponse)
async def get_area(
    area_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    area = db.query(Area).filter(Area.id == area_id).first()
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Area not found",
        )
    return area


@router.put("/areas/{area_id}", response_model=AreaResponse)
async def update_area(
    area_id: UUID,
    area_data: AreaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    area = db.query(Area).filter(Area.id == area_id).first()
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Area not found",
        )

    update_data = area_data.model_dump(exclude_unset=True)

    # Check if code already exists within the store (if updating code)
    if "code" in update_data:
        existing = db.query(Area).filter(
            Area.store_id == area.store_id,
            Area.code == update_data["code"],
            Area.id != area_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Area code already exists in this store",
            )

    for key, value in update_data.items():
        setattr(area, key, value)

    db.commit()
    db.refresh(area)
    return area


@router.delete("/areas/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_area(
    area_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    area = db.query(Area).filter(Area.id == area_id).first()
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Area not found",
        )

    db.delete(area)
    db.commit()


@router.get("/areas/{area_id}/public", response_model=AreaResponse)
async def get_area_public(
    area_id: UUID,
    db: Session = Depends(get_db),
):
    """Public endpoint to get area info (no authentication required)."""
    area = db.query(Area).filter(Area.id == area_id, Area.is_active == True).first()
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Area not found or inactive",
        )
    return area


@router.get("/areas/{area_id}/qrcode")
async def get_area_qrcode(
    area_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    area = db.query(Area).filter(Area.id == area_id).first()
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Area not found",
        )

    # Generate QR code with registration URL
    # Format: {frontend_url}/register?area_id={area_id}
    qr_data = f"{settings.frontend_url}/register?area_id={area_id}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    # Convert to bytes
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="image/png",
        headers={
            "Content-Disposition": f"inline; filename=qr_area_{area_id}.png"
        }
    )
