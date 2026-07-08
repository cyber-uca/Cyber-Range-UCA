from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/vm-templates", tags=["vm-templates"])


@router.get("", response_model=List[schemas.VMTemplateOut])
def list_vm_templates(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.VMTemplate).all()
