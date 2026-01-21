from typing import List, Optional
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.campaign import Campaign, CampaignArea
from app.models.area import Area
from app.models.store import Store
from app.models.user import User
from app.schemas.campaign import (
    CampaignCreate, CampaignUpdate, CampaignResponse, CampaignAreaUpdate,
    CampaignConflictCheckRequest, CampaignConflictCheckResponse,
    CampaignConflict, CampaignConflictInfo
)
from app.schemas.area import AreaResponse
from app.dependencies import get_current_admin

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("", response_model=List[CampaignResponse])
async def list_campaigns(
    store_id: Optional[UUID] = Query(None, description="店舗IDでフィルタ"),
    is_active: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    query = db.query(Campaign)

    if store_id is not None:
        query = query.filter(Campaign.store_id == store_id)

    if is_active is not None:
        query = query.filter(Campaign.is_active == is_active)

    campaigns = query.order_by(Campaign.created_at.desc()).offset(skip).limit(limit).all()
    return campaigns


@router.post("/check-conflicts", response_model=CampaignConflictCheckResponse)
async def check_campaign_conflicts(
    request: CampaignConflictCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    指定されたエリアと期間で、他のキャンペーンと重複がないかチェックする。
    """
    if not request.area_ids:
        return CampaignConflictCheckResponse(has_conflicts=False, conflicts=[])

    # Get area info with store
    areas = db.query(Area).filter(Area.id.in_(request.area_ids)).all()
    area_map = {area.id: area for area in areas}

    # Get store info
    store_ids = list(set(area.store_id for area in areas))
    stores = db.query(Store).filter(Store.id.in_(store_ids)).all()
    store_map = {store.id: store for store in stores}

    # Get all campaign areas for the specified areas
    campaign_areas = db.query(CampaignArea).filter(
        CampaignArea.area_id.in_(request.area_ids)
    ).options(joinedload(CampaignArea.campaign)).all()

    conflicts = []
    for ca in campaign_areas:
        campaign = ca.campaign

        # Skip excluded campaign (for edit mode)
        if request.exclude_campaign_id and campaign.id == request.exclude_campaign_id:
            continue

        # Skip inactive campaigns
        if not campaign.is_active:
            continue

        # Check date overlap
        if campaign.start_date <= request.end_date and campaign.end_date >= request.start_date:
            area = area_map.get(ca.area_id)
            store = store_map.get(area.store_id) if area else None

            if area and store:
                conflicts.append(CampaignConflict(
                    area_id=ca.area_id,
                    area_name=area.name,
                    store_name=store.name,
                    conflicting_campaign=CampaignConflictInfo(
                        id=campaign.id,
                        name=campaign.name,
                        start_date=campaign.start_date,
                        end_date=campaign.end_date,
                        is_active=campaign.is_active
                    )
                ))

    return CampaignConflictCheckResponse(
        has_conflicts=len(conflicts) > 0,
        conflicts=conflicts
    )


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign_data: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    # Validate store exists
    store = db.query(Store).filter(Store.id == campaign_data.store_id).first()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )

    # Validate dates
    if campaign_data.end_date < campaign_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date",
        )

    campaign = Campaign(**campaign_data.model_dump())
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )
    return campaign


@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: UUID,
    campaign_data: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    update_data = campaign_data.model_dump(exclude_unset=True)

    # Validate dates if both are being updated
    start_date = update_data.get("start_date", campaign.start_date)
    end_date = update_data.get("end_date", campaign.end_date)
    if end_date < start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date",
        )

    for key, value in update_data.items():
        setattr(campaign, key, value)

    db.commit()
    db.refresh(campaign)
    return campaign


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    db.delete(campaign)
    db.commit()


@router.get("/{campaign_id}/areas", response_model=List[AreaResponse])
async def get_campaign_areas(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    campaign_areas = db.query(CampaignArea).filter(
        CampaignArea.campaign_id == campaign_id
    ).all()

    area_ids = [ca.area_id for ca in campaign_areas]
    areas = db.query(Area).filter(Area.id.in_(area_ids)).all()
    return areas


@router.put("/{campaign_id}/areas", response_model=List[AreaResponse])
async def update_campaign_areas(
    campaign_id: UUID,
    area_data: CampaignAreaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # Validate all area IDs exist
    areas = db.query(Area).filter(Area.id.in_(area_data.area_ids)).all()
    if len(areas) != len(area_data.area_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more area IDs are invalid",
        )

    # Validate all areas belong to the same store as the campaign
    for area in areas:
        if area.store_id != campaign.store_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Area '{area.name}' does not belong to the same store as this campaign",
            )

    # Delete existing campaign areas
    db.query(CampaignArea).filter(CampaignArea.campaign_id == campaign_id).delete()

    # Create new campaign areas
    for area_id in area_data.area_ids:
        campaign_area = CampaignArea(campaign_id=campaign_id, area_id=area_id)
        db.add(campaign_area)

    db.commit()

    return areas
