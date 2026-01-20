from typing import List, Optional
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.campaign import Campaign, CampaignArea
from app.models.area import Area
from app.models.user import User
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse, CampaignAreaUpdate
from app.schemas.area import AreaResponse
from app.dependencies import get_current_admin

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("", response_model=List[CampaignResponse])
async def list_campaigns(
    is_active: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    query = db.query(Campaign)

    if is_active is not None:
        query = query.filter(Campaign.is_active == is_active)

    campaigns = query.order_by(Campaign.created_at.desc()).offset(skip).limit(limit).all()
    return campaigns


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign_data: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
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

    # Delete existing campaign areas
    db.query(CampaignArea).filter(CampaignArea.campaign_id == campaign_id).delete()

    # Create new campaign areas
    for area_id in area_data.area_ids:
        campaign_area = CampaignArea(campaign_id=campaign_id, area_id=area_id)
        db.add(campaign_area)

    db.commit()

    return areas
