from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.store import Store
from app.models.user import User
from app.schemas.store import StoreCreate, StoreUpdate, StoreResponse
from app.dependencies import get_current_admin

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("", response_model=List[StoreResponse])
async def list_stores(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    stores = db.query(Store).offset(skip).limit(limit).all()
    return stores


@router.post("", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
async def create_store(
    store_data: StoreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    # Check if code already exists
    existing = db.query(Store).filter(Store.code == store_data.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Store code already exists",
        )

    store = Store(**store_data.model_dump())
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


@router.get("/{store_id}", response_model=StoreResponse)
async def get_store(
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
    return store


@router.put("/{store_id}", response_model=StoreResponse)
async def update_store(
    store_id: UUID,
    store_data: StoreUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )

    update_data = store_data.model_dump(exclude_unset=True)

    # Check if code already exists (if updating code)
    if "code" in update_data:
        existing = db.query(Store).filter(
            Store.code == update_data["code"],
            Store.id != store_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Store code already exists",
            )

    for key, value in update_data.items():
        setattr(store, key, value)

    db.commit()
    db.refresh(store)
    return store


@router.delete("/{store_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_store(
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

    db.delete(store)
    db.commit()
