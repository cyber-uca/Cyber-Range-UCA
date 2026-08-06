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
#  DOMAINS — public read
# ═══════════════════════════════════════════════════════════════════

@router.get("/domains", response_model=List[schemas.DomainOut])
def list_domains_public(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all domains — all authenticated users."""
    return db.query(models.Domain).order_by(models.Domain.sort_order).all()


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

# ═══════════════════════════════════════════════════════════════════
#  MODULE QUIZ — public learner endpoints
# ═══════════════════════════════════════════════════════════════════

def _quiz_q_out(q: models.ModuleQuizQuestion) -> dict:
    return {
        "id": q.id,
        "text": q.text,
        "explanation": q.explanation,
        "points": q.points,
        "sort_order": q.sort_order,
        "options": [
            {"id": o.id, "text": o.text, "sort_order": o.sort_order}
            for o in q.options
        ],
    }


@router.get("/modules/{module_id}/quiz")
def get_module_quiz(
    module_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Return quiz questions for a module.
    Learners can only access this if they have completed all rooms in the module.
    Admins/tutors can always access it for preview.
    """
    module = _get_module_or_404(module_id, db)
    is_admin = current_user.role in (models.Role.ADMIN, models.Role.TUTOR)

    if not is_admin:
        # Check all rooms are completed
        room_ids = [r.id for r in module.rooms]
        if room_ids:
            done = db.query(models.UserRoomProgress).filter(
                models.UserRoomProgress.user_id == current_user.id,
                models.UserRoomProgress.room_id.in_(room_ids),
                models.UserRoomProgress.is_completed == True,
            ).count()
            if done < len(room_ids):
                raise HTTPException(
                    status_code=403,
                    detail=f"Complete all rooms first ({done}/{len(room_ids)} done)"
                )

    # Previous attempt if any
    last_attempt = db.query(models.UserModuleQuizAttempt).filter(
        models.UserModuleQuizAttempt.user_id == current_user.id,
        models.UserModuleQuizAttempt.module_id == module_id,
    ).order_by(models.UserModuleQuizAttempt.attempted_at.desc()).first()

    questions = sorted(module.quiz_questions, key=lambda q: q.sort_order)
    return {
        "module_id": module.id,
        "module_title": module.title,
        "pass_pct": 70,
        "question_count": len(questions),
        "total_points": sum(q.points for q in questions),
        "questions": [_quiz_q_out(q) for q in questions],
        "last_attempt": {
            "score": last_attempt.score,
            "max_score": last_attempt.max_score,
            "passed": last_attempt.passed,
            "attempted_at": last_attempt.attempted_at.isoformat(),
        } if last_attempt else None,
    }


@router.post("/modules/{module_id}/quiz/submit")
def submit_module_quiz(
    module_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Submit answers for the module quiz.
    payload: { "answers": [{"question_id": "...", "option_id": "..."}, ...] }
    Returns: { passed, score, max_score, pct, pass_pct, results: [...] }
    """
    module = _get_module_or_404(module_id, db)
    questions = {q.id: q for q in module.quiz_questions}
    answers_in = {a["question_id"]: a.get("option_id") for a in payload.get("answers", [])}

    pass_pct = 70
    score = 0
    max_score = sum(q.points for q in questions.values())
    results = []

    for qid, q in questions.items():
        vd = q.validation_data or {}
        submitted_opt_id = answers_in.get(qid)
        correct_id    = vd.get("correct_option_id")
        correct_index = vd.get("correct_option_index")

        # Grade: match by option id first, then by index
        is_correct = submitted_opt_id == correct_id
        if not is_correct and correct_index is not None and submitted_opt_id:
            opts_sorted = sorted(q.options, key=lambda o: o.sort_order)
            submitted_index = next(
                (i for i, o in enumerate(opts_sorted) if o.id == submitted_opt_id), None
            )
            is_correct = submitted_index == correct_index

        if is_correct:
            score += q.points

        # Find the correct option text for feedback
        correct_opt = next(
            (o for o in q.options if o.id == correct_id), None
        ) if correct_id else None

        results.append({
            "question_id":       qid,
            "question_text":     q.text,
            "submitted_option_id": submitted_opt_id,
            "correct_option_id": correct_id,
            "correct_option_text": correct_opt.text if correct_opt else None,
            "is_correct":        is_correct,
            "points_awarded":    q.points if is_correct else 0,
            "explanation":       q.explanation,
        })

    pct     = round(score / max_score * 100) if max_score else 0
    passed  = pct >= pass_pct

    # Save attempt
    attempt = models.UserModuleQuizAttempt(
        user_id=current_user.id,
        module_id=module_id,
        score=score,
        max_score=max_score,
        passed=passed,
        pass_pct=pass_pct,
        answers_json=results,
    )
    db.add(attempt)

    # If passed, mark module as quiz-passed (update module progress)
    if passed:
        prog = db.query(models.UserModuleProgress).filter(
            models.UserModuleProgress.user_id == current_user.id,
            models.UserModuleProgress.module_id == module_id,
        ).first()
        if prog:
            prog.is_completed = True
            if not prog.completed_at:
                from datetime import datetime
                prog.completed_at = datetime.utcnow()

    db.commit()

    return {
        "passed":    passed,
        "score":     score,
        "max_score": max_score,
        "pct":       pct,
        "pass_pct":  pass_pct,
        "results":   results,
    }


# ═══════════════════════════════════════════════════════════════════
#  MODULE QUIZ — admin CRUD
# ═══════════════════════════════════════════════════════════════════

@router.post("/modules/{module_id}/quiz/questions")
def add_quiz_question(
    module_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    """
    Create a quiz question for a module.
    payload: { text, explanation, points, sort_order, options: [{text, is_correct, sort_order}] }
    """
    module = _get_module_or_404(module_id, db)
    q = models.ModuleQuizQuestion(
        module_id=module.id,
        text=payload["text"],
        explanation=payload.get("explanation"),
        points=payload.get("points", 10),
        sort_order=payload.get("sort_order", 0),
    )
    db.add(q); db.flush()

    opts = payload.get("options", [])
    correct_indices = []
    new_opts = []
    for i, o in enumerate(opts):
        opt = models.ModuleQuizOption(
            question_id=q.id,
            text=o["text"],
            sort_order=i,
        )
        db.add(opt); db.flush()
        new_opts.append(opt)
        if o.get("is_correct"):
            correct_indices.append(i)

    if correct_indices:
        q.validation_data = {
            "correct_option_id":    new_opts[correct_indices[0]].id,
            "correct_option_index": correct_indices[0],
        }

    db.commit(); db.refresh(q)
    return _quiz_q_out(q)


@router.patch("/modules/quiz/questions/{question_id}")
def update_quiz_question(
    question_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    q = db.query(models.ModuleQuizQuestion).filter(
        models.ModuleQuizQuestion.id == question_id
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz question not found")

    for field in ("text", "explanation", "points", "sort_order"):
        if field in payload:
            setattr(q, field, payload[field])

    if "options" in payload:
        db.query(models.ModuleQuizOption).filter(
            models.ModuleQuizOption.question_id == question_id
        ).delete()
        db.flush()
        opts = payload["options"]
        correct_indices = []
        new_opts = []
        for i, o in enumerate(opts):
            opt = models.ModuleQuizOption(question_id=q.id, text=o["text"], sort_order=i)
            db.add(opt); db.flush()
            new_opts.append(opt)
            if o.get("is_correct"):
                correct_indices.append(i)
        if correct_indices:
            q.validation_data = {
                "correct_option_id":    new_opts[correct_indices[0]].id,
                "correct_option_index": correct_indices[0],
            }

    db.commit(); db.refresh(q)
    return _quiz_q_out(q)


@router.delete("/modules/quiz/questions/{question_id}")
def delete_quiz_question(
    question_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    q = db.query(models.ModuleQuizQuestion).filter(
        models.ModuleQuizQuestion.id == question_id
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quiz question not found")
    db.delete(q); db.commit()
    return {"status": "deleted"}
