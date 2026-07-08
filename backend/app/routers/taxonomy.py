from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(tags=["taxonomy"])


@router.get("/categories", response_model=List[schemas.CategoryOut])
def list_categories_public(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Any logged-in user can read the category list (needed for the
    Challenge Library filters, Dashboard hero cards, and the Challenge
    Creator's category picker). Only admins can create/delete categories -
    see /admin/categories for that.
    """
    return db.query(models.Category).order_by(models.Category.sort_order).all()


@router.get("/difficulties", response_model=List[schemas.DifficultyOut])
def list_difficulties_public(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Difficulty).order_by(models.Difficulty.sort_order).all()


@router.get("/challenge-types")
def list_challenge_types_public(current_user: models.User = Depends(get_current_user)):
    """Any logged-in tutor/admin needs this to pick a grading mechanic in the Challenge Creator."""
    from ..gateway.challenge_type_gateway import list_registered_types
    return {"registered_types": list_registered_types()}
