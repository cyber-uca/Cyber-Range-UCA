"""
Rooms, Tasks, and Questions router.
Public:  GET /rooms/{slug}
Learner: GET with progress overlay
Admin/Tutor: full CRUD
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/rooms", tags=["rooms"])


# ── serialisers ────────────────────────────────────────────────────────────

def _option_out(o: models.QuestionOption) -> dict:
    return {"id": o.id, "text": o.text, "sort_order": o.sort_order, "match_key": o.match_key}


def _hint_out(h: models.QuestionHint, unlocked_ids: set) -> dict:
    unlocked = h.id in unlocked_ids
    return {
        "id": h.id,
        "content": h.content if unlocked else None,
        "cost": h.cost,
        "order": h.order,
        "unlocked": unlocked,
    }


def _question_out(q: models.Question, unlocked_ids: set, admin: bool = False) -> dict:
    d = {
        "id": q.id, "task_id": q.task_id,
        "question_type": q.question_type, "text": q.text,
        "explanation": q.explanation, "points": q.points,
        "is_mandatory": q.is_mandatory, "sort_order": q.sort_order,
        "options": [_option_out(o) for o in q.options],
        "hints": [_hint_out(h, unlocked_ids) for h in q.hints],
    }
    if admin:
        d["validation_data"] = q.validation_data
    return d


def _task_out(t: models.Task, unlocked_ids: set, admin: bool = False) -> dict:
    return {
        "id": t.id, "room_id": t.room_id, "title": t.title,
        "description": t.description, "objectives": t.objectives,
        "sort_order": t.sort_order, "estimated_minutes": t.estimated_minutes,
        "points": t.points, "completion_rule": t.completion_rule,
        "min_score_pct": t.min_score_pct,
        "questions": [_question_out(q, unlocked_ids, admin) for q in t.questions],
    }


def _room_detail(r: models.Room, unlocked_ids: set = None, admin: bool = False) -> dict:
    if unlocked_ids is None:
        unlocked_ids = set()
    return {
        "id": r.id, "slug": r.slug, "module_id": r.module_id,
        "title": r.title, "description": r.description,
        "story": r.story, "objectives": r.objectives,
        "difficulty": r.difficulty, "estimated_minutes": r.estimated_minutes,
        "tags": r.tags, "mitre_attack": r.mitre_attack,
        "prerequisites": r.prerequisites, "cover_image": r.cover_image,
        "xp_reward": r.xp_reward, "sort_order": r.sort_order, "status": r.status,
        "tasks": [_task_out(t, unlocked_ids, admin) for t in r.tasks],
        "vm_assignments": [
            {"id": a.id, "vm_template": {
                "id": a.vm_template.id, "name": a.vm_template.name,
                "zone": a.vm_template.zone,
                "proxmox_template_id": a.vm_template.proxmox_template_id,
                "default_tools": a.vm_template.default_tools,
                "description": a.vm_template.description,
            }, "sort_order": a.sort_order}
            for a in r.vm_assignments
        ],
    }


def _get_room_or_404(slug_or_id: str, db: Session) -> models.Room:
    r = db.query(models.Room).filter(
        (models.Room.slug == slug_or_id) | (models.Room.id == slug_or_id)
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Room not found")
    return r


def _get_task_or_404(task_id: str, db: Session) -> models.Task:
    t = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return t


def _get_question_or_404(question_id: str, db: Session) -> models.Question:
    q = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return q


def _user_unlocked_hints(user_id: str, db: Session) -> set:
    rows = db.query(models.QuestionHintUnlock.hint_id).filter(
        models.QuestionHintUnlock.user_id == user_id
    ).all()
    return {r.hint_id for r in rows}


# ═══════════════════════════════════════════════════════════════════
#  PUBLIC
# ═══════════════════════════════════════════════════════════════════

@router.get("")
def list_rooms(
    module_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List rooms. Learners see only published rooms; admins/tutors see all."""
    q = db.query(models.Room).order_by(models.Room.sort_order)
    is_admin = current_user.role in (models.Role.ADMIN, models.Role.TUTOR)
    if not is_admin:
        q = q.filter(models.Room.status == models.PublicationStatus.PUBLISHED)
    if module_id:
        q = q.filter(models.Room.module_id == module_id)
    rooms = q.all()
    return [
        {
            "id": r.id, "slug": r.slug, "module_id": r.module_id,
            "title": r.title, "description": r.description,
            "difficulty": r.difficulty, "estimated_minutes": r.estimated_minutes,
            "tags": r.tags, "xp_reward": r.xp_reward,
            "sort_order": r.sort_order, "status": r.status,
            "task_count": len(r.tasks),
            "vm_count": len(r.vm_assignments),
        }
        for r in rooms
    ]


@router.get("/{slug}")
def get_room(
    slug: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    room = _get_room_or_404(slug, db)
    is_admin = current_user.role in (models.Role.ADMIN, models.Role.TUTOR)
    if not is_admin and room.status != models.PublicationStatus.PUBLISHED:
        raise HTTPException(status_code=404, detail="Room not found")
    unlocked = _user_unlocked_hints(current_user.id, db)
    return _room_detail(room, unlocked, admin=is_admin)


# ═══════════════════════════════════════════════════════════════════
#  ADMIN/TUTOR — Room CRUD
# ═══════════════════════════════════════════════════════════════════

@router.post("/in-module/{module_id}")
def create_room(
    module_id: str,
    payload: schemas.RoomCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    module = db.query(models.Module).filter(models.Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    vm_ids = payload.vm_template_ids or []
    data = payload.model_dump(exclude={"vm_template_ids"})
    room = models.Room(module_id=module.id, created_by=current_user.id, **data)
    db.add(room); db.flush()
    for i, vm_id in enumerate(vm_ids):
        db.add(models.RoomVMTemplate(room_id=room.id, vm_template_id=vm_id, sort_order=i))
    db.commit(); db.refresh(room)
    return _room_detail(room, admin=True)


@router.patch("/{room_id}")
def update_room(
    room_id: str,
    payload: schemas.RoomUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    room = _get_room_or_404(room_id, db)
    vm_ids = payload.vm_template_ids
    data = payload.model_dump(exclude_unset=True, exclude={"vm_template_ids"})
    for k, v in data.items():
        setattr(room, k, v)
    if vm_ids is not None:
        db.query(models.RoomVMTemplate).filter(models.RoomVMTemplate.room_id == room.id).delete()
        for i, vm_id in enumerate(vm_ids):
            db.add(models.RoomVMTemplate(room_id=room.id, vm_template_id=vm_id, sort_order=i))
    db.commit(); db.refresh(room)
    return _room_detail(room, admin=True)


@router.post("/{room_id}/publish")
def publish_room(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    room = _get_room_or_404(room_id, db)
    room.status = models.PublicationStatus.PUBLISHED
    db.commit()
    return {"status": "published"}


@router.post("/{room_id}/unpublish")
def unpublish_room(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    room = _get_room_or_404(room_id, db)
    room.status = models.PublicationStatus.DRAFT
    db.commit()
    return {"status": "draft"}


@router.delete("/{room_id}")
def delete_room(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    room = _get_room_or_404(room_id, db)
    db.delete(room); db.commit()
    return {"status": "deleted"}


# ═══════════════════════════════════════════════════════════════════
#  ADMIN/TUTOR — Task CRUD
# ═══════════════════════════════════════════════════════════════════

@router.post("/{room_id}/tasks")
def create_task(
    room_id: str,
    payload: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    room = _get_room_or_404(room_id, db)
    task = models.Task(room_id=room.id, **payload.model_dump())
    db.add(task); db.commit(); db.refresh(task)
    return _task_out(task, set(), admin=True)


@router.patch("/tasks/{task_id}")
def update_task(
    task_id: str,
    payload: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    task = _get_task_or_404(task_id, db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(task, k, v)
    db.commit(); db.refresh(task)
    return _task_out(task, set(), admin=True)


@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    task = _get_task_or_404(task_id, db)
    db.delete(task); db.commit()
    return {"status": "deleted"}


# ═══════════════════════════════════════════════════════════════════
#  ADMIN/TUTOR — Question CRUD
# ═══════════════════════════════════════════════════════════════════

@router.post("/tasks/{task_id}/questions")
def create_question(
    task_id: str,
    payload: schemas.QuestionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    task = _get_task_or_404(task_id, db)
    opts = payload.options or []
    hints = payload.hints or []
    data = payload.model_dump(exclude={"options", "hints"})
    question = models.Question(task_id=task.id, **data)
    db.add(question); db.flush()

    correct_indices = []
    new_opts = []
    for i, o in enumerate(opts):
        opt = models.QuestionOption(
            question_id=question.id,
            text=o.text,
            sort_order=o.sort_order,
        )
        db.add(opt); db.flush()
        new_opts.append(opt)
        if o.is_correct:
            correct_indices.append(i)

    # Build validation_data from correct option IDs
    if new_opts:
        correct_opt_ids = [new_opts[i].id for i in correct_indices]
        if question.question_type == models.QuestionType.MCQ_SINGLE:
            question.validation_data = {
                "correct_option_id":    correct_opt_ids[0] if correct_opt_ids else None,
                "correct_option_index": correct_indices[0] if correct_indices else None,
            }
        elif question.question_type == models.QuestionType.MCQ_MULTI:
            question.validation_data = {
                "correct_option_ids":     correct_opt_ids,
                "correct_option_indices": correct_indices,
            }

    for h in hints:
        db.add(models.QuestionHint(question_id=question.id, **h.model_dump()))
    db.commit(); db.refresh(question)
    return _question_out(question, set(), admin=True)


@router.patch("/questions/{question_id}")
def update_question(
    question_id: str,
    payload: schemas.QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    question = _get_question_or_404(question_id, db)
    data = payload.model_dump(exclude_unset=True, exclude={"options"})
    for k, v in data.items():
        setattr(question, k, v)

    # If options are provided, replace them and rebuild validation_data
    if payload.options is not None:
        db.query(models.QuestionOption).filter(
            models.QuestionOption.question_id == question_id
        ).delete()
        db.flush()

        new_opts = []
        correct_indices = []
        for i, o in enumerate(payload.options):
            opt = models.QuestionOption(
                question_id=question.id,
                text=o.text,
                sort_order=o.sort_order,
            )
            db.add(opt)
            db.flush()
            new_opts.append(opt)
            if o.is_correct:
                correct_indices.append(i)

        # Rebuild validation_data with the new correct option IDs
        correct_opt_ids = [new_opts[i].id for i in correct_indices]
        correct_opt_indices = correct_indices  # stable across edits
        if question.question_type == models.QuestionType.MCQ_SINGLE:
            question.validation_data = {
                "correct_option_id":    correct_opt_ids[0] if correct_opt_ids else None,
                "correct_option_index": correct_indices[0] if correct_indices else None,
            }
        elif question.question_type == models.QuestionType.MCQ_MULTI:
            question.validation_data = {
                "correct_option_ids":     correct_opt_ids,
                "correct_option_indices": correct_indices,
            }

    db.commit()
    db.refresh(question)
    return _question_out(question, set(), admin=True)


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    question = _get_question_or_404(question_id, db)
    db.delete(question); db.commit()
    return {"status": "deleted"}


@router.post("/questions/{question_id}/options")
def add_option(
    question_id: str,
    payload: schemas.QuestionOptionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    question = _get_question_or_404(question_id, db)
    opt = models.QuestionOption(question_id=question.id, **payload.model_dump())
    db.add(opt); db.commit(); db.refresh(opt)
    return _option_out(opt)


@router.delete("/options/{option_id}")
def delete_option(
    option_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.ADMIN)),
):
    opt = db.query(models.QuestionOption).filter(models.QuestionOption.id == option_id).first()
    if not opt:
        raise HTTPException(status_code=404, detail="Option not found")
    db.delete(opt); db.commit()
    return {"status": "deleted"}


@router.post("/questions/{question_id}/hints")
def add_hint(
    question_id: str,
    payload: schemas.QuestionHintCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    question = _get_question_or_404(question_id, db)
    hint = models.QuestionHint(question_id=question.id, **payload.model_dump())
    db.add(hint); db.commit(); db.refresh(hint)
    return {"id": hint.id, "content": hint.content, "cost": hint.cost, "order": hint.order}
