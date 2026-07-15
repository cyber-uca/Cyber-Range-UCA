"""
Admin router — stats, user management, VM templates, platform settings.
All endpoints require ADMIN role except where noted.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import require_role

router = APIRouter(prefix="/admin", tags=["admin"])


# ═══════════════════════════════════════════════════════════════════
#  STATS
# ═══════════════════════════════════════════════════════════════════

@router.get("/stats", response_model=schemas.PlatformStats)
def platform_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    return schemas.PlatformStats(
        total_users       = db.query(models.User).count(),
        learners          = db.query(models.User).filter(models.User.role == models.Role.LEARNER).count(),
        tutors            = db.query(models.User).filter(models.User.role == models.Role.TUTOR).count(),
        active_environments = db.query(models.Environment).filter(
            models.Environment.status == models.EnvironmentStatus.RUNNING
        ).count(),
        total_paths    = db.query(models.Path).count(),
        total_modules  = db.query(models.Module).count(),
        total_rooms    = db.query(models.Room).count(),
        total_tasks    = db.query(models.Task).count(),
        total_questions = db.query(models.Question).count(),
        vm_templates   = db.query(models.VMTemplate).count(),
    )


# ═══════════════════════════════════════════════════════════════════
#  USERS
# ═══════════════════════════════════════════════════════════════════

class UserRoleUpdate(BaseModel):
    role: models.Role


class UserActiveUpdate(BaseModel):
    is_active: bool


@router.get("/users", response_model=List[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    return db.query(models.User).all()


@router.patch("/users/{user_id}/role", response_model=schemas.UserOut)
def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    db.commit(); db.refresh(user)
    return user


@router.patch("/users/{user_id}/active", response_model=schemas.UserOut)
def update_user_active(
    user_id: str,
    payload: UserActiveUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user.is_active = payload.is_active
    db.commit(); db.refresh(user)
    return user


# ═══════════════════════════════════════════════════════════════════
#  VM TEMPLATES
# ═══════════════════════════════════════════════════════════════════

@router.get("/vm-templates", response_model=List[schemas.VMTemplateOut])
def list_vm_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    return db.query(models.VMTemplate).all()


@router.post("/vm-templates", response_model=schemas.VMTemplateOut)
def create_vm_template(
    payload: schemas.VMTemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    tpl = models.VMTemplate(**payload.model_dump())
    db.add(tpl); db.commit(); db.refresh(tpl)
    return tpl


@router.patch("/vm-templates/{tpl_id}", response_model=schemas.VMTemplateOut)
def update_vm_template(
    tpl_id: str,
    payload: schemas.VMTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    tpl = db.query(models.VMTemplate).filter(models.VMTemplate.id == tpl_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="VM template not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(tpl, k, v)
    db.commit(); db.refresh(tpl)
    return tpl


@router.delete("/vm-templates/{tpl_id}")
def delete_vm_template(
    tpl_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    tpl = db.query(models.VMTemplate).filter(models.VMTemplate.id == tpl_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="VM template not found")
    in_use = db.query(models.RoomVMTemplate).filter(
        models.RoomVMTemplate.vm_template_id == tpl_id
    ).first()
    if in_use:
        raise HTTPException(status_code=400, detail="Template is assigned to a room — remove it first")
    db.delete(tpl); db.commit()
    return {"status": "deleted"}


# ═══════════════════════════════════════════════════════════════════
#  CATEGORIES & DIFFICULTIES  (challenge taxonomy)
# ═══════════════════════════════════════════════════════════════════

@router.get("/categories", response_model=List[schemas.CategoryOut])
def list_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    return db.query(models.Category).order_by(models.Category.sort_order).all()


@router.post("/categories", response_model=schemas.CategoryOut)
def create_category(
    payload: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    if db.query(models.Category).filter(models.Category.slug == payload.slug).first():
        raise HTTPException(status_code=400, detail="A category with this slug already exists")
    category = models.Category(**payload.model_dump())
    db.add(category); db.commit(); db.refresh(category)
    return category


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    in_use = db.query(models.Challenge).filter(models.Challenge.category_id == category_id).first()
    if in_use:
        raise HTTPException(status_code=400, detail="Category is used by a challenge — remove it first")
    db.delete(category); db.commit()
    return {"status": "deleted"}


@router.get("/difficulties", response_model=List[schemas.DifficultyOut])
def list_difficulties(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    return db.query(models.Difficulty).order_by(models.Difficulty.sort_order).all()


@router.post("/difficulties", response_model=schemas.DifficultyOut)
def create_difficulty(
    payload: schemas.DifficultyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    if db.query(models.Difficulty).filter(models.Difficulty.slug == payload.slug).first():
        raise HTTPException(status_code=400, detail="A difficulty with this slug already exists")
    difficulty = models.Difficulty(**payload.model_dump())
    db.add(difficulty); db.commit(); db.refresh(difficulty)
    return difficulty


@router.delete("/difficulties/{difficulty_id}")
def delete_difficulty(
    difficulty_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    difficulty = db.query(models.Difficulty).filter(models.Difficulty.id == difficulty_id).first()
    if not difficulty:
        raise HTTPException(status_code=404, detail="Difficulty not found")
    in_use = db.query(models.Challenge).filter(models.Challenge.difficulty_id == difficulty_id).first()
    if in_use:
        raise HTTPException(status_code=400, detail="Difficulty is used by a challenge — remove it first")
    db.delete(difficulty); db.commit()
    return {"status": "deleted"}


@router.get("/challenge-types")
def list_challenge_types(
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    from ..gateway.challenge_type_gateway import list_registered_types
    return {"registered_types": list_registered_types()}


# ═══════════════════════════════════════════════════════════════════
#  PLATFORM SETTINGS
# ═══════════════════════════════════════════════════════════════════

@router.get("/settings", response_model=schemas.PlatformSettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    s = db.query(models.PlatformSettings).filter_by(id="singleton").first()
    if not s:
        raise HTTPException(status_code=404, detail="Settings not initialised")
    return s


@router.patch("/settings", response_model=schemas.PlatformSettingsOut)
def update_settings(
    payload: schemas.PlatformSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    s = db.query(models.PlatformSettings).filter_by(id="singleton").first()
    if not s:
        raise HTTPException(status_code=404, detail="Settings not initialised")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit(); db.refresh(s)
    return s


# ═══════════════════════════════════════════════════════════════════
#  ENVIRONMENT MANAGEMENT (admin view)
# ═══════════════════════════════════════════════════════════════════

@router.get("/environments")
def list_active_environments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    envs = db.query(models.Environment).filter(
        models.Environment.status.in_([
            models.EnvironmentStatus.RUNNING,
            models.EnvironmentStatus.PROVISIONING,
        ])
    ).all()
    result = []
    for e in envs:
        user = db.query(models.User).filter(models.User.id == e.user_id).first()
        result.append({
            "id": e.id,
            "user": {"id": user.id, "name": user.name, "email": user.email} if user else None,
            "room_id": e.room_id,
            "status": e.status,
            "started_at": e.started_at,
            "expires_at": e.expires_at,
            "vm_count": len(e.vms),
        })
    return result
