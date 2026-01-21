import io
import base64
from typing import List, Optional
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
import qrcode

from app.database import get_db
from app.models.store import Store
from app.models.area import Area
from app.models.campaign import Campaign, CampaignArea
from app.models.user import User
from app.schemas.area import (
    AreaCreate, AreaUpdate, AreaResponse,
    AreaCampaignAssignment, AreaCampaignAssignmentResponse, CampaignInfo
)
from app.dependencies import get_current_admin
from app.config import settings

router = APIRouter(tags=["areas"])


@router.get("/areas/campaign-assignments", response_model=AreaCampaignAssignmentResponse)
async def get_area_campaign_assignments(
    store_id: Optional[UUID] = Query(None, description="店舗IDでフィルタ"),
    start_date: Optional[date] = Query(None, description="チェック対象の開始日"),
    end_date: Optional[date] = Query(None, description="チェック対象の終了日"),
    exclude_campaign_id: Optional[UUID] = Query(None, description="除外するキャンペーンID（編集時用）"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    エリアのキャンペーン割り当て状況を取得する。
    store_id を指定すると、その店舗のエリアのみ取得する。
    start_date/end_date を指定すると、その期間と重複するキャンペーンを検出する。
    """
    # Get stores (filter by store_id if provided)
    stores_query = db.query(Store)
    if store_id:
        stores_query = stores_query.filter(Store.id == store_id)
    stores = stores_query.all()
    store_map = {store.id: store for store in stores}

    # Get areas (filter by store_id if provided)
    areas_query = db.query(Area)
    if store_id:
        areas_query = areas_query.filter(Area.store_id == store_id)
    areas = areas_query.all()

    # Get all campaign areas with campaign info
    campaign_areas = db.query(CampaignArea).options(
        joinedload(CampaignArea.campaign)
    ).all()

    # Build area_id -> campaigns mapping
    area_campaigns: dict[UUID, list[Campaign]] = {}
    for ca in campaign_areas:
        if ca.area_id not in area_campaigns:
            area_campaigns[ca.area_id] = []
        area_campaigns[ca.area_id].append(ca.campaign)

    result_areas = []
    for area in areas:
        store = store_map.get(area.store_id)
        if not store:
            continue

        campaigns = area_campaigns.get(area.id, [])

        # Filter out excluded campaign
        if exclude_campaign_id:
            campaigns = [c for c in campaigns if c.id != exclude_campaign_id]

        # Build campaign info list
        assigned_campaigns = [
            CampaignInfo(
                id=c.id,
                name=c.name,
                start_date=c.start_date,
                end_date=c.end_date,
                is_active=c.is_active
            )
            for c in campaigns
        ]

        # Find conflicting campaigns (overlapping date range)
        conflicting_campaigns = []
        has_conflict = False

        if start_date and end_date:
            for c in campaigns:
                # Check date overlap: campaign overlaps if:
                # campaign.start_date <= query.end_date AND campaign.end_date >= query.start_date
                if c.start_date <= end_date and c.end_date >= start_date and c.is_active:
                    has_conflict = True
                    conflicting_campaigns.append(
                        CampaignInfo(
                            id=c.id,
                            name=c.name,
                            start_date=c.start_date,
                            end_date=c.end_date,
                            is_active=c.is_active
                        )
                    )

        result_areas.append(
            AreaCampaignAssignment(
                area_id=area.id,
                area_name=area.name,
                area_code=area.code,
                store_id=store.id,
                store_name=store.name,
                assigned_campaigns=assigned_campaigns,
                has_conflict=has_conflict,
                conflicting_campaigns=conflicting_campaigns
            )
        )

    return AreaCampaignAssignmentResponse(areas=result_areas)


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
