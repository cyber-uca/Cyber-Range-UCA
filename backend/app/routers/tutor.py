from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import require_role

router = APIRouter(prefix="/tutor", tags=["tutor"])


@router.get("/active-sessions", response_model=List[schemas.EnvironmentOut])
def active_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    """All environments currently running, for the Learner Monitoring screen."""
    return db.query(models.Environment).filter(
        models.Environment.status == models.EnvironmentStatus.RUNNING
    ).all()


@router.get("/learners", response_model=List[schemas.UserOut])
def list_learners(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    return db.query(models.User).filter(models.User.role == models.Role.LEARNER).all()
