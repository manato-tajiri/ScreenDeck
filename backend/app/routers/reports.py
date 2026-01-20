from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.models.playback_log import PlaybackLog
from app.models.campaign import Campaign
from app.models.media import Media
from app.models.device import Device
from app.models.area import Area
from app.models.store import Store
from app.models.user import User
from app.dependencies import get_current_admin

router = APIRouter(prefix="/reports", tags=["reports"])


class CampaignReport(BaseModel):
    campaign_id: UUID
    campaign_name: str
    play_count: int
    unique_devices: int


class StoreReport(BaseModel):
    store_id: UUID
    store_name: str
    play_count: int
    device_count: int


class DeviceReport(BaseModel):
    device_id: UUID
    device_code: str
    device_name: Optional[str]
    store_name: str
    area_name: str
    play_count: int


@router.get("/campaigns", response_model=List[CampaignReport])
async def get_campaign_reports(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    campaign_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get playback statistics grouped by campaign."""
    # Default to last 30 days if no dates specified
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())

    query = db.query(
        PlaybackLog.campaign_id,
        func.count(PlaybackLog.id).label("play_count"),
        func.count(func.distinct(PlaybackLog.device_id)).label("unique_devices")
    ).filter(
        PlaybackLog.played_at >= start_datetime,
        PlaybackLog.played_at <= end_datetime,
    )

    if campaign_id:
        query = query.filter(PlaybackLog.campaign_id == campaign_id)

    query = query.group_by(PlaybackLog.campaign_id)
    results = query.all()

    # Get campaign names
    campaign_ids = [r[0] for r in results]
    campaigns = {c.id: c for c in db.query(Campaign).filter(Campaign.id.in_(campaign_ids)).all()}

    reports = []
    for campaign_id, play_count, unique_devices in results:
        campaign = campaigns.get(campaign_id)
        if campaign:
            reports.append(CampaignReport(
                campaign_id=campaign_id,
                campaign_name=campaign.name,
                play_count=play_count,
                unique_devices=unique_devices,
            ))

    return sorted(reports, key=lambda x: x.play_count, reverse=True)


@router.get("/stores", response_model=List[StoreReport])
async def get_store_reports(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    store_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get playback statistics grouped by store."""
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())

    # Join through Device -> Area -> Store
    query = db.query(
        Store.id,
        Store.name,
        func.count(PlaybackLog.id).label("play_count"),
        func.count(func.distinct(PlaybackLog.device_id)).label("device_count")
    ).join(
        Area, Area.store_id == Store.id
    ).join(
        Device, Device.area_id == Area.id
    ).join(
        PlaybackLog, PlaybackLog.device_id == Device.id
    ).filter(
        PlaybackLog.played_at >= start_datetime,
        PlaybackLog.played_at <= end_datetime,
    )

    if store_id:
        query = query.filter(Store.id == store_id)

    query = query.group_by(Store.id, Store.name)
    results = query.all()

    reports = []
    for store_id, store_name, play_count, device_count in results:
        reports.append(StoreReport(
            store_id=store_id,
            store_name=store_name,
            play_count=play_count,
            device_count=device_count,
        ))

    return sorted(reports, key=lambda x: x.play_count, reverse=True)


@router.get("/devices", response_model=List[DeviceReport])
async def get_device_reports(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    store_id: Optional[UUID] = Query(None),
    area_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get playback statistics grouped by device."""
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())

    query = db.query(
        Device.id,
        Device.device_code,
        Device.name,
        Store.name.label("store_name"),
        Area.name.label("area_name"),
        func.count(PlaybackLog.id).label("play_count")
    ).join(
        Area, Device.area_id == Area.id
    ).join(
        Store, Area.store_id == Store.id
    ).join(
        PlaybackLog, PlaybackLog.device_id == Device.id
    ).filter(
        PlaybackLog.played_at >= start_datetime,
        PlaybackLog.played_at <= end_datetime,
    )

    if store_id:
        query = query.filter(Store.id == store_id)
    if area_id:
        query = query.filter(Area.id == area_id)

    query = query.group_by(
        Device.id, Device.device_code, Device.name,
        Store.name, Area.name
    )
    results = query.all()

    reports = []
    for device_id, device_code, device_name, store_name, area_name, play_count in results:
        reports.append(DeviceReport(
            device_id=device_id,
            device_code=device_code,
            device_name=device_name,
            store_name=store_name,
            area_name=area_name,
            play_count=play_count,
        ))

    return sorted(reports, key=lambda x: x.play_count, reverse=True)


@router.get("/summary")
async def get_summary(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get overall summary statistics."""
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())

    # Total play count
    total_plays = db.query(func.count(PlaybackLog.id)).filter(
        PlaybackLog.played_at >= start_datetime,
        PlaybackLog.played_at <= end_datetime,
    ).scalar() or 0

    # Active devices
    active_devices = db.query(func.count(func.distinct(PlaybackLog.device_id))).filter(
        PlaybackLog.played_at >= start_datetime,
        PlaybackLog.played_at <= end_datetime,
    ).scalar() or 0

    # Active campaigns
    active_campaigns = db.query(func.count(func.distinct(PlaybackLog.campaign_id))).filter(
        PlaybackLog.played_at >= start_datetime,
        PlaybackLog.played_at <= end_datetime,
    ).scalar() or 0

    # Total stores, areas, devices
    total_stores = db.query(func.count(Store.id)).scalar() or 0
    total_areas = db.query(func.count(Area.id)).scalar() or 0
    total_devices = db.query(func.count(Device.id)).scalar() or 0
    total_campaigns = db.query(func.count(Campaign.id)).scalar() or 0

    return {
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        "playback": {
            "total_plays": total_plays,
            "active_devices": active_devices,
            "active_campaigns": active_campaigns,
        },
        "inventory": {
            "total_stores": total_stores,
            "total_areas": total_areas,
            "total_devices": total_devices,
            "total_campaigns": total_campaigns,
        },
    }
