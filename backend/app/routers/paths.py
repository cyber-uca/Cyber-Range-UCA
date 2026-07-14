"""
Paths and Modules router.
Public: GET /paths, GET /paths/{slug}, GET /paths/{slug}/modules
Tutor/Admin: full CRUD on Paths and Modules
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/paths", tags=["paths"])


# ── helpers ────────────────────────────────────────────────────────────────

def _path_card(p: models.Path) -> dict:
    return {
        "id": p.id, "slug": p.slug, "title": p.title,
        "description": p.description, "icon": p.icon, "color": p.color,
        "cover_image": p.cover_image, "sort_order": p.sort_order,
        "status": p.status,
        "module_count": len(p.modules),
    }


def _module_out(m: models.Module) -> dict:
    rooms = []
    for r in m.rooms:
        rooms.append({
            "id": r.id, "slug": r.slug, "title": r.title,
            "description": r.description, "difficulty": r.difficulty,
            "estimated_minutes": r.estimated_minutes, "tags": r.tags,
            "mitre_attack": r.mitre_attack, "xp_reward": r.xp_reward,
            "sort_order": r.sort_order, "status": r.status,
            "task_count": len(r.tasks),
            "vm_count": len(r.vm_assignments),
        })
    return {
        "id": m.id, "path_id": m.path_id, "slug": m.slug,
        "title": m.title, "description": m.description,
        "sort_order": m.sort_order, "status": m.status,
        "room_count": len(m.rooms), "rooms": rooms,
    }


def _path_out(p: models.Path) -> dict:
    d = _path_card(p)
    d["modules"] = [_module_out(m) for m in p.modules]
    return d


def _get_path_or_404(slug_or_id: str, db: Session) -> models.Path:
    p = db.query(models.Path).filter(
        (models.Path.slug == slug_or_id) | (models.Path.id == slug_or_id)
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Path not found")
    return p


def _get_module_or_404(module_id: str, db: Session) -> models.Module:
    m = db.query(models.Module).filter(models.Module.id == module_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Module not found")
    return m


# ═══════════════════════════════════════════════════════════════════
#  PUBLIC — any authenticated user
# ═══════════════════════════════════════════════════════════════════

@router.get("", response_model=List[schemas.PathCard])
def list_paths(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all published paths (learners) or all paths (admin/tutor)."""
    q = db.query(models.Path).order_by(models.Path.sort_order)
    if current_user.role == models.Role.LEARNER:
        q = q.filter(models.Path.status == models.PublicationStatus.PUBLISHED)
    paths = q.all()
    return [_path_card(p) for p in paths]


@router.get("/{slug}")
def get_path(
    slug: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a single path with all its modules and rooms."""
    p = _get_path_or_404(slug, db)
    if current_user.role == models.Role.LEARNER and p.status != models.PublicationStatus.PUBLISHED:
        raise HTTPException(status_code=404, detail="Path not found")
    return _path_out(p)


# ═══════════════════════════════════════════════════════════════════
#  ADMIN / TUTOR — Path CRUD
# ═══════════════════════════════════════════════════════════════════

@router.post("", response_model=schemas.PathCard)
def create_path(
    payload: schemas.PathCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    if db.query(models.Path).filter(models.Path.slug == payload.slug).first():
        raise HTTPException(status_code=400, detail="Slug already in use")
    path = models.Path(**payload.model_dump())
    db.add(path); db.commit(); db.refresh(path)
    return _path_card(path)


@router.patch("/{path_id}")
def update_path(
    path_id: str,
    payload: schemas.PathUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    path = _get_path_or_404(path_id, db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(path, k, v)
    db.commit(); db.refresh(path)
    return _path_card(path)


@router.post("/{path_id}/publish")
def publish_path(
    path_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    path = _get_path_or_404(path_id, db)
    path.status = models.PublicationStatus.PUBLISHED
    db.commit()
    return {"status": "published"}


@router.post("/{path_id}/unpublish")
def unpublish_path(
    path_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    path = _get_path_or_404(path_id, db)
    path.status = models.PublicationStatus.DRAFT
    db.commit()
    return {"status": "draft"}


@router.delete("/{path_id}")
def delete_path(
    path_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    path = _get_path_or_404(path_id, db)
    db.delete(path); db.commit()
    return {"status": "deleted"}


# ═══════════════════════════════════════════════════════════════════
#  ADMIN / TUTOR — Module CRUD (nested under path)
# ═══════════════════════════════════════════════════════════════════

@router.post("/{path_id}/modules")
def create_module(
    path_id: str,
    payload: schemas.ModuleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    path = _get_path_or_404(path_id, db)
    module = models.Module(path_id=path.id, **payload.model_dump())
    db.add(module); db.commit(); db.refresh(module)
    return _module_out(module)


@router.patch("/modules/{module_id}")
def update_module(
    module_id: str,
    payload: schemas.ModuleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    module = _get_module_or_404(module_id, db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(module, k, v)
    db.commit(); db.refresh(module)
    return _module_out(module)


@router.post("/modules/{module_id}/publish")
def publish_module(
    module_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    m = _get_module_or_404(module_id, db)
    m.status = models.PublicationStatus.PUBLISHED
    db.commit()
    return {"status": "published"}


@router.post("/modules/{module_id}/unpublish")
def unpublish_module(
    module_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    m = _get_module_or_404(module_id, db)
    m.status = models.PublicationStatus.DRAFT
    db.commit()
    return {"status": "draft"}


@router.delete("/modules/{module_id}")
def delete_module(
    module_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    m = _get_module_or_404(module_id, db)
    db.delete(m); db.commit()
    return {"status": "deleted"}
