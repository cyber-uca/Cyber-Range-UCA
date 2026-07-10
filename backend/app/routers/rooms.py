from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/rooms", tags=["rooms"])


def _enrich_room(room: models.Room) -> dict:
    """Attach challenge_count to a Room ORM object for RoomOut."""
    d = {
        "id": room.id,
        "slug": room.slug,
        "title": room.title,
        "description": room.description,
        "category": room.category,
        "lab_layer": room.lab_layer,
        "difficulty": room.difficulty,
        "is_published": room.is_published,
        "sort_order": room.sort_order,
        "challenge_count": len(room.challenges),
    }
    return d


@router.get("", response_model=List[schemas.RoomOut])
def list_rooms(
    category: Optional[str] = None,
    lab_layer: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Room).filter(models.Room.is_published == True)  # noqa: E712
    if category:
        q = q.join(models.Category).filter(models.Category.slug == category)
    if lab_layer:
        q = q.filter(models.Room.lab_layer == lab_layer)
    rooms = q.order_by(models.Room.sort_order).all()
    return [_enrich_room(r) for r in rooms]


@router.get("/{room_slug}", response_model=schemas.RoomDetail)
def get_room(
    room_slug: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    room = db.query(models.Room).filter(models.Room.slug == room_slug).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


# ── Admin CRUD ─────────────────────────────────────────────────────────────

class RoomCreate(schemas.BaseModel if hasattr(schemas, "BaseModel") else object):
    pass


from pydantic import BaseModel as _Base


class RoomCreatePayload(_Base):
    slug: str
    title: str
    description: Optional[str] = None
    category_id: str
    lab_layer: Optional[str] = None
    difficulty: str = "medium"
    sort_order: int = 0
    challenge_ids: List[str] = []   # ordered list of challenge IDs


@router.post("", response_model=schemas.RoomDetail)
def create_room(
    payload: RoomCreatePayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    if db.query(models.Room).filter(models.Room.slug == payload.slug).first():
        raise HTTPException(status_code=400, detail="Slug already in use")
    room = models.Room(
        slug=payload.slug, title=payload.title, description=payload.description,
        category_id=payload.category_id, lab_layer=payload.lab_layer,
        difficulty=payload.difficulty, sort_order=payload.sort_order,
        is_published=False,
    )
    db.add(room)
    db.flush()
    for i, cid in enumerate(payload.challenge_ids):
        db.add(models.RoomChallenge(room_id=room.id, challenge_id=cid, order=i))
    db.commit()
    db.refresh(room)
    return room


@router.post("/{room_slug}/publish")
def publish_room(
    room_slug: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    room = db.query(models.Room).filter(models.Room.slug == room_slug).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    room.is_published = True
    db.commit()
    return {"status": "published"}


@router.delete("/{room_slug}")
def delete_room(
    room_slug: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    room = db.query(models.Room).filter(models.Room.slug == room_slug).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    db.delete(room)
    db.commit()
    return {"status": "deleted"}
