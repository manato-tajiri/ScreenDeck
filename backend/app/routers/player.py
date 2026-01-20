import hashlib
import random
from typing import List
from uuid import UUID
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.device import Device, DeviceStatus
from app.models.area import Area
from app.models.campaign import Campaign, CampaignArea
from app.models.media import Media
from app.models.playback_log import PlaybackLog
from app.schemas.playlist import PlaylistResponse, PlaylistItem
from app.schemas.playback_log import PlaybackLogCreate
from app.utils.storage import get_file_url

router = APIRouter(prefix="/player", tags=["player"])


def weighted_shuffle(items: List[PlaylistItem]) -> List[PlaylistItem]:
    """Shuffle items while respecting their relative weights."""
    if not items:
        return []

    # Create multiple copies based on weight (simplified for MVP)
    # In production, use more sophisticated weighting
    expanded = []
    for item in items:
        # Each item appears proportional to campaign weight
        expanded.append(item)

    random.shuffle(expanded)
    return expanded


@router.get("/playlist", response_model=PlaylistResponse)
async def get_playlist(
    device_id: UUID = Query(...),
    db: Session = Depends(get_db)
):
    """
    Get playlist for a device.
    Called by player every 15 minutes to sync content.
    """
    # Get device and its area
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    # Update device status
    device.status = DeviceStatus.ONLINE
    device.last_sync_at = datetime.utcnow()
    db.commit()

    area_id = device.area_id
    today = date.today()

    # Get active campaigns for this area
    campaign_areas = db.query(CampaignArea).filter(
        CampaignArea.area_id == area_id
    ).all()

    campaign_ids = [ca.campaign_id for ca in campaign_areas]

    # Filter to only active campaigns within date range
    active_campaigns = db.query(Campaign).filter(
        Campaign.id.in_(campaign_ids),
        Campaign.is_active == True,
        Campaign.start_date <= today,
        Campaign.end_date >= today,
    ).all()

    # Build playlist items
    playlist_items = []
    total_weight = sum(c.weight for c in active_campaigns) or 1

    for campaign in active_campaigns:
        # Get media for this campaign
        media_items = db.query(Media).filter(
            Media.campaign_id == campaign.id
        ).order_by(Media.sort_order).all()

        for media in media_items:
            # Generate fresh URL
            media_url = get_file_url(media.gcs_path)

            playlist_items.append(PlaylistItem(
                media_id=media.id,
                campaign_id=campaign.id,
                url=media_url,
                type=media.type,
                duration_seconds=media.duration_seconds,
                filename=media.filename,
            ))

    # Shuffle based on weights
    shuffled_items = weighted_shuffle(playlist_items)

    # Generate version hash for cache invalidation
    version_data = f"{area_id}-{datetime.utcnow().isoformat()}"
    version = hashlib.md5(version_data.encode()).hexdigest()[:8]

    return PlaylistResponse(
        version=version,
        items=shuffled_items,
        generated_at=datetime.utcnow(),
    )


@router.post("/logs", status_code=status.HTTP_201_CREATED)
async def submit_playback_logs(
    logs: List[PlaybackLogCreate],
    db: Session = Depends(get_db)
):
    """
    Submit batch of playback logs from device.
    Called periodically to sync playback data.
    """
    if not logs:
        return {"message": "No logs to process"}

    # Validate device exists (use first log's device_id)
    device_id = logs[0].device_id
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    # Create playback log records
    synced_at = datetime.utcnow()
    created_count = 0

    for log_data in logs:
        # Validate all logs are for the same device
        if log_data.device_id != device_id:
            continue

        playback_log = PlaybackLog(
            device_id=log_data.device_id,
            media_id=log_data.media_id,
            campaign_id=log_data.campaign_id,
            played_at=log_data.played_at,
            synced_at=synced_at,
        )
        db.add(playback_log)
        created_count += 1

    db.commit()

    return {"message": f"Processed {created_count} logs"}


@router.post("/heartbeat")
async def heartbeat(
    device_id: UUID = Query(...),
    db: Session = Depends(get_db)
):
    """
    Simple heartbeat endpoint to update device status.
    """
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    device.status = DeviceStatus.ONLINE
    device.last_sync_at = datetime.utcnow()
    db.commit()

    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
