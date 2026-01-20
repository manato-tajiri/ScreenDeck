import uuid
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.campaign import Campaign
from app.models.media import Media, MediaType
from app.models.user import User
from app.schemas.media import MediaUpdate, MediaResponse
from app.dependencies import get_current_admin
from app.utils.storage import upload_file, get_file_url, delete_file

router = APIRouter(tags=["media"])

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB


@router.get("/campaigns/{campaign_id}/media", response_model=List[MediaResponse])
async def list_campaign_media(
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

    media_items = db.query(Media).filter(
        Media.campaign_id == campaign_id
    ).order_by(Media.sort_order).all()

    # Generate fresh URLs
    for item in media_items:
        item.gcs_url = get_file_url(item.gcs_path)

    return media_items


@router.post("/campaigns/{campaign_id}/media", response_model=MediaResponse, status_code=status.HTTP_201_CREATED)
async def upload_media(
    campaign_id: UUID,
    file: UploadFile = File(...),
    duration_seconds: int = Form(default=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # Validate content type
    content_type = file.content_type
    if content_type in ALLOWED_IMAGE_TYPES:
        media_type = MediaType.IMAGE
    elif content_type in ALLOWED_VIDEO_TYPES:
        media_type = MediaType.VIDEO
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {content_type}",
        )

    # Read file content
    file_content = await file.read()
    file_size = len(file_content)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE / 1024 / 1024}MB",
        )

    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
    unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
    gcs_path = f"campaigns/{campaign_id}/{unique_filename}"

    # Upload to storage
    try:
        storage_path = upload_file(file_content, gcs_path, content_type)
        file_url = get_file_url(storage_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}",
        )

    # Get next sort order
    max_order = db.query(Media).filter(
        Media.campaign_id == campaign_id
    ).count()

    # Create media record
    media = Media(
        campaign_id=campaign_id,
        type=media_type,
        filename=file.filename,
        gcs_path=storage_path,
        gcs_url=file_url,
        duration_seconds=duration_seconds,
        file_size=file_size,
        mime_type=content_type,
        sort_order=max_order,
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    return media


@router.get("/media/{media_id}", response_model=MediaResponse)
async def get_media(
    media_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found",
        )

    # Generate fresh URL
    media.gcs_url = get_file_url(media.gcs_path)
    return media


@router.put("/media/{media_id}", response_model=MediaResponse)
async def update_media(
    media_id: UUID,
    media_data: MediaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found",
        )

    update_data = media_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(media, key, value)

    db.commit()
    db.refresh(media)

    # Generate fresh URL
    media.gcs_url = get_file_url(media.gcs_path)
    return media


@router.delete("/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(
    media_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found",
        )

    # Delete from storage
    try:
        delete_file(media.gcs_path)
    except Exception:
        pass  # Continue even if storage delete fails

    db.delete(media)
    db.commit()
