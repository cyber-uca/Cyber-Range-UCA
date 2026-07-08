from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import require_role

router = APIRouter(prefix="/admin", tags=["admin"])


class PlatformStats(BaseModel):
    total_users: int
    learners: int
    tutors: int
    active_environments: int
    total_challenges: int
    published_challenges: int
    vm_templates: int


class UserRoleUpdate(BaseModel):
    role: models.Role


class UserActiveUpdate(BaseModel):
    is_active: bool


class VMTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    zone: str
    proxmox_template_id: int
    default_tools: Optional[str] = None


@router.get("/stats", response_model=PlatformStats)
def platform_stats(db: Session = Depends(get_db), current_user: models.User = Depends(require_role(models.Role.ADMIN))):
    return PlatformStats(
        total_users=db.query(models.User).count(),
        learners=db.query(models.User).filter(models.User.role == models.Role.LEARNER).count(),
        tutors=db.query(models.User).filter(models.User.role == models.Role.TUTOR).count(),
        active_environments=db.query(models.Environment).filter(
            models.Environment.status == models.EnvironmentStatus.RUNNING).count(),
        total_challenges=db.query(models.Challenge).count(),
        published_challenges=db.query(models.Challenge).filter(models.Challenge.is_published == True).count(),  # noqa: E712
        vm_templates=db.query(models.VMTemplate).count(),
    )


@router.get("/users", response_model=List[schemas.UserOut])
def list_users(db: Session = Depends(get_db), current_user: models.User = Depends(require_role(models.Role.ADMIN))):
    return db.query(models.User).all()


@router.patch("/users/{user_id}/role", response_model=schemas.UserOut)
def update_user_role(
    user_id: str, payload: UserRoleUpdate,
    db: Session = Depends(get_db), current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/active", response_model=schemas.UserOut)
def update_user_active(
    user_id: str, payload: UserActiveUpdate,
    db: Session = Depends(get_db), current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="You can't deactivate your own account")
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


@router.get("/vm-templates", response_model=List[schemas.VMTemplateOut])
def list_all_vm_templates(db: Session = Depends(get_db), current_user: models.User = Depends(require_role(models.Role.ADMIN))):
    return db.query(models.VMTemplate).all()


@router.post("/vm-templates", response_model=schemas.VMTemplateOut)
def create_vm_template(
    payload: VMTemplateCreate,
    db: Session = Depends(get_db), current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    template = models.VMTemplate(**payload.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/vm-templates/{template_id}")
def delete_vm_template(
    template_id: str,
    db: Session = Depends(get_db), current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    template = db.query(models.VMTemplate).filter(models.VMTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="VM template not found")
    in_use = db.query(models.ChallengeVM).filter(models.ChallengeVM.vm_template_id == template_id).first()
    if in_use:
        raise HTTPException(status_code=400, detail="This VM template is used by at least one challenge - remove it from those challenges first")
    db.delete(template)
    db.commit()
    return {"status": "deleted"}


# ---------- Categories (data-driven - the concrete "gateway for data" example) ----------
@router.get("/categories", response_model=List[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db), current_user: models.User = Depends(require_role(models.Role.ADMIN))):
    return db.query(models.Category).order_by(models.Category.sort_order).all()


@router.post("/categories", response_model=schemas.CategoryOut)
def create_category(
    payload: schemas.CategoryCreate,
    db: Session = Depends(get_db), current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    if db.query(models.Category).filter(models.Category.slug == payload.slug).first():
        raise HTTPException(status_code=400, detail="A category with this slug already exists")
    category = models.Category(**payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: str,
    db: Session = Depends(get_db), current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    in_use = db.query(models.Challenge).filter(models.Challenge.category_id == category_id).first()
    if in_use:
        raise HTTPException(status_code=400, detail="This category is used by at least one challenge - reassign those challenges first")
    db.delete(category)
    db.commit()
    return {"status": "deleted"}


# ---------- Difficulties (same pattern as categories) ----------
@router.get("/difficulties", response_model=List[schemas.DifficultyOut])
def list_difficulties(db: Session = Depends(get_db), current_user: models.User = Depends(require_role(models.Role.ADMIN))):
    return db.query(models.Difficulty).order_by(models.Difficulty.sort_order).all()


@router.post("/difficulties", response_model=schemas.DifficultyOut)
def create_difficulty(
    payload: schemas.DifficultyCreate,
    db: Session = Depends(get_db), current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    if db.query(models.Difficulty).filter(models.Difficulty.slug == payload.slug).first():
        raise HTTPException(status_code=400, detail="A difficulty with this slug already exists")
    difficulty = models.Difficulty(**payload.model_dump())
    db.add(difficulty)
    db.commit()
    db.refresh(difficulty)
    return difficulty


@router.delete("/difficulties/{difficulty_id}")
def delete_difficulty(
    difficulty_id: str,
    db: Session = Depends(get_db), current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    difficulty = db.query(models.Difficulty).filter(models.Difficulty.id == difficulty_id).first()
    if not difficulty:
        raise HTTPException(status_code=404, detail="Difficulty not found")
    in_use = db.query(models.Challenge).filter(models.Challenge.difficulty_id == difficulty_id).first()
    if in_use:
        raise HTTPException(status_code=400, detail="This difficulty is used by at least one challenge - reassign those challenges first")
    db.delete(difficulty)
    db.commit()
    return {"status": "deleted"}


# ---------- Challenge types (read-only list of what's registered in the gateway) ----------
@router.get("/challenge-types")
def list_challenge_types(current_user: models.User = Depends(require_role(models.Role.ADMIN))):
    """
    Lists whatever grading mechanics are currently registered in the
    challenge-type gateway. This is intentionally read-only - new types are
    added by writing a class and registering it in code (see
    gateway/challenge_type_gateway.py), not through the admin UI, since a
    grading mechanic is logic, not data. What IS admin-editable is which
    type an individual challenge uses.
    """
    from ..gateway.challenge_type_gateway import list_registered_types
    return {"registered_types": list_registered_types()}


# ---------- Platform settings (centralized config) ----------
@router.get("/settings", response_model=schemas.PlatformSettingsOut)
def get_settings(db: Session = Depends(get_db), current_user: models.User = Depends(require_role(models.Role.ADMIN))):
    settings = db.query(models.PlatformSettings).filter(models.PlatformSettings.id == "singleton").first()
    return settings


@router.patch("/settings", response_model=schemas.PlatformSettingsOut)
def update_settings(
    payload: schemas.PlatformSettingsUpdate,
    db: Session = Depends(get_db), current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    settings = db.query(models.PlatformSettings).filter(models.PlatformSettings.id == "singleton").first()
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings
