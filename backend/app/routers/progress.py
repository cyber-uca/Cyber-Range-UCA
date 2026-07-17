"""
Progress router — answer submission, hint unlock, progress retrieval.
All endpoints require authentication.
"""
import hashlib
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/progress", tags=["progress"])


# ── validation engine ──────────────────────────────────────────────────────

def _hash_value(v: str) -> str:
    return hashlib.sha256(v.strip().encode()).hexdigest()


def _validate_answer(question: models.Question, value: Optional[str], data: Optional[dict]) -> tuple[bool, str]:
    """Returns (is_correct, message)."""
    qtype = question.question_type
    vd = question.validation_data or {}

    if qtype == models.QuestionType.FLAG:
        if not value:
            return False, "No answer submitted."
        flag_hash = vd.get("flag_hash", "")
        case_sensitive = vd.get("case_sensitive", False)
        submitted = value.strip() if case_sensitive else value.strip().upper()
        stored    = flag_hash  # already hashed at creation
        # Support both plain comparison (for ANSWER_X style) and hash comparison
        if flag_hash.startswith("sha256:"):
            actual_hash = hashlib.sha256(submitted.encode()).hexdigest()
            is_ok = actual_hash == flag_hash[7:]
        else:
            # Plain stored value (ANSWER_B_C style — no hash needed, stored directly)
            is_ok = (submitted == flag_hash if case_sensitive
                     else submitted.upper() == flag_hash.upper())
        return is_ok, ("Correct!" if is_ok else "Incorrect answer — try again.")

    if qtype == models.QuestionType.MCQ_SINGLE:
        correct = vd.get("correct_option_id", "")
        is_ok = value == correct
        return is_ok, ("Correct!" if is_ok else "That's not the right option.")

    if qtype == models.QuestionType.MCQ_MULTI:
        correct = set(vd.get("correct_option_ids", []))
        submitted_set = set((data or {}).get("option_ids", []))
        is_ok = submitted_set == correct
        return is_ok, ("Correct!" if is_ok else "Not all selections are correct.")

    if qtype == models.QuestionType.TRUE_FALSE:
        correct = str(vd.get("correct", "true")).lower()
        is_ok = (value or "").strip().lower() == correct
        return is_ok, ("Correct!" if is_ok else "Incorrect.")

    if qtype == models.QuestionType.SHORT_TEXT:
        accepted = [a.strip().lower() for a in vd.get("accepted", [])]
        regex_pat = vd.get("regex")
        submitted_clean = (value or "").strip().lower()
        if regex_pat:
            import re
            is_ok = bool(re.fullmatch(regex_pat, submitted_clean, re.IGNORECASE))
        else:
            is_ok = submitted_clean in accepted
        return is_ok, ("Correct!" if is_ok else "That answer isn't quite right.")

    if qtype == models.QuestionType.NUMERIC:
        try:
            submitted_num = float(value or "")
        except ValueError:
            return False, "Please enter a number."
        target = float(vd.get("value", 0))
        tol    = float(vd.get("tolerance", 0))
        is_ok  = abs(submitted_num - target) <= tol
        return is_ok, ("Correct!" if is_ok else f"Expected {target} (±{tol}).")

    if qtype in (models.QuestionType.FILE_UPLOAD, models.QuestionType.MANUAL_REVIEW,
                 models.QuestionType.ORDERING, models.QuestionType.MATCHING):
        # These require manual review or more complex logic — auto-accept for now
        return True, "Submission recorded. Awaiting review."

    return False, "Unknown question type."


def _recompute_task_progress(user_id: str, task: models.Task, db: Session):
    """Recompute and upsert UserTaskProgress after a question is answered."""
    questions = task.questions
    if not questions:
        return

    answers = db.query(models.UserQuestionAnswer).filter(
        models.UserQuestionAnswer.user_id == user_id,
        models.UserQuestionAnswer.question_id.in_([q.id for q in questions]),
        models.UserQuestionAnswer.is_correct == True,
    ).all()

    correct_q_ids = {a.question_id for a in answers}
    score = sum(q.points for q in questions if q.id in correct_q_ids)
    max_score = sum(q.points for q in questions)

    # Check completion based on task rule
    rule = task.completion_rule
    is_completed = False
    if rule == models.TaskCompletionRule.ALL_QUESTIONS:
        is_completed = all(q.id in correct_q_ids for q in questions)
    elif rule == models.TaskCompletionRule.MANDATORY_ONLY:
        mandatory = [q for q in questions if q.is_mandatory]
        is_completed = all(q.id in correct_q_ids for q in mandatory)
    elif rule == models.TaskCompletionRule.MIN_SCORE:
        pct = (score / max_score * 100) if max_score else 0
        is_completed = pct >= task.min_score_pct
    elif rule == models.TaskCompletionRule.ANY_CORRECT:
        is_completed = len(correct_q_ids) > 0

    prog = db.query(models.UserTaskProgress).filter(
        models.UserTaskProgress.user_id == user_id,
        models.UserTaskProgress.task_id == task.id,
    ).first()
    if not prog:
        prog = models.UserTaskProgress(
            user_id=user_id, task_id=task.id,
            started_at=datetime.utcnow()
        )
        db.add(prog)
    prog.score = score
    prog.max_score = max_score
    prev_completed = prog.is_completed
    prog.is_completed = is_completed
    if is_completed and not prev_completed:
        prog.completed_at = datetime.utcnow()
    db.flush()

    if is_completed and not prev_completed:
        _recompute_room_progress(user_id, task.room_id, db)


def _recompute_room_progress(user_id: str, room_id: str, db: Session):
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        return
    tasks = room.tasks
    task_prog = db.query(models.UserTaskProgress).filter(
        models.UserTaskProgress.user_id == user_id,
        models.UserTaskProgress.task_id.in_([t.id for t in tasks]),
    ).all()
    done_ids = {p.task_id for p in task_prog if p.is_completed}
    score = sum(p.score for p in task_prog)
    max_score = sum(sum(q.points for q in t.questions) for t in tasks)

    prog = db.query(models.UserRoomProgress).filter(
        models.UserRoomProgress.user_id == user_id,
        models.UserRoomProgress.room_id == room_id,
    ).first()
    if not prog:
        prog = models.UserRoomProgress(
            user_id=user_id, room_id=room_id,
            tasks_total=len(tasks), started_at=datetime.utcnow()
        )
        db.add(prog)
    prog.tasks_done  = len(done_ids)
    prog.tasks_total = len(tasks)
    prog.score       = score
    prog.max_score   = max_score
    prev_completed   = prog.is_completed
    prog.is_completed = len(done_ids) == len(tasks) and len(tasks) > 0
    if prog.is_completed and not prev_completed:
        prog.completed_at = datetime.utcnow()
        # Award room XP
        xp = room.xp_reward or max_score
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            user.points += xp
    db.flush()
    _recompute_module_progress(user_id, room.module_id, db)


def _recompute_module_progress(user_id: str, module_id: str, db: Session):
    module = db.query(models.Module).filter(models.Module.id == module_id).first()
    if not module:
        return
    rooms = module.rooms
    room_prog = db.query(models.UserRoomProgress).filter(
        models.UserRoomProgress.user_id == user_id,
        models.UserRoomProgress.room_id.in_([r.id for r in rooms]),
    ).all()
    done = sum(1 for p in room_prog if p.is_completed)
    score = sum(p.score for p in room_prog)

    prog = db.query(models.UserModuleProgress).filter(
        models.UserModuleProgress.user_id == user_id,
        models.UserModuleProgress.module_id == module_id,
    ).first()
    if not prog:
        prog = models.UserModuleProgress(
            user_id=user_id, module_id=module_id,
            rooms_total=len(rooms), started_at=datetime.utcnow()
        )
        db.add(prog)
    prog.rooms_done  = done
    prog.rooms_total = len(rooms)
    prog.score       = score
    prev = prog.is_completed
    prog.is_completed = done == len(rooms) and len(rooms) > 0
    if prog.is_completed and not prev:
        prog.completed_at = datetime.utcnow()
    db.flush()
    _recompute_path_progress(user_id, module.path_id, db)


def _recompute_path_progress(user_id: str, path_id: str, db: Session):
    path = db.query(models.Path).filter(models.Path.id == path_id).first()
    if not path:
        return
    modules = path.modules
    mod_prog = db.query(models.UserModuleProgress).filter(
        models.UserModuleProgress.user_id == user_id,
        models.UserModuleProgress.module_id.in_([m.id for m in modules]),
    ).all()
    done  = sum(1 for p in mod_prog if p.is_completed)
    score = sum(p.score for p in mod_prog)

    prog = db.query(models.UserPathProgress).filter(
        models.UserPathProgress.user_id == user_id,
        models.UserPathProgress.path_id == path_id,
    ).first()
    if not prog:
        prog = models.UserPathProgress(
            user_id=user_id, path_id=path_id,
            modules_total=len(modules), started_at=datetime.utcnow()
        )
        db.add(prog)
    prog.modules_done  = done
    prog.modules_total = len(modules)
    prog.score         = score
    prog.is_completed  = done == len(modules) and len(modules) > 0
    db.flush()


# ═══════════════════════════════════════════════════════════════════
#  ANSWER SUBMISSION
# ═══════════════════════════════════════════════════════════════════

@router.post("/questions/{question_id}/answer")
def submit_answer(
    question_id: str,
    payload: schemas.AnswerSubmit,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Count previous attempts
    attempts = db.query(models.UserQuestionAnswer).filter(
        models.UserQuestionAnswer.user_id == current_user.id,
        models.UserQuestionAnswer.question_id == question_id,
    ).count()

    # Already solved — return cached result
    already_correct = db.query(models.UserQuestionAnswer).filter(
        models.UserQuestionAnswer.user_id == current_user.id,
        models.UserQuestionAnswer.question_id == question_id,
        models.UserQuestionAnswer.is_correct == True,
    ).first()
    if already_correct:
        return schemas.AnswerResult(
            is_correct=True, points_awarded=0,
            message="Already solved — no additional points.",
            explanation=question.explanation,
        )

    is_correct, message = _validate_answer(question, payload.value, payload.data)
    points = question.points if is_correct else 0

    answer = models.UserQuestionAnswer(
        user_id=current_user.id,
        question_id=question_id,
        submitted_value=payload.value,
        submitted_data=payload.data,
        is_correct=is_correct,
        points_awarded=points,
        attempt_number=attempts + 1,
    )
    db.add(answer)
    db.flush()

    # Cascade progress
    _recompute_task_progress(current_user.id, question.task, db)
    db.commit()

    return schemas.AnswerResult(
        is_correct=is_correct,
        points_awarded=points,
        message=message,
        explanation=question.explanation if is_correct else None,
    )


# ═══════════════════════════════════════════════════════════════════
#  HINT UNLOCK
# ═══════════════════════════════════════════════════════════════════

@router.post("/hints/{hint_id}/unlock")
def unlock_hint(
    hint_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    hint = db.query(models.QuestionHint).filter(models.QuestionHint.id == hint_id).first()
    if not hint:
        raise HTTPException(status_code=404, detail="Hint not found")

    already = db.query(models.QuestionHintUnlock).filter(
        models.QuestionHintUnlock.user_id == current_user.id,
        models.QuestionHintUnlock.hint_id == hint_id,
    ).first()
    if already:
        return {"content": hint.content, "already_unlocked": True, "points_deducted": 0}

    settings = db.query(models.PlatformSettings).filter_by(id="singleton").first()
    deducted = 0
    if settings and settings.hint_penalties_enabled and hint.cost > 0:
        if current_user.points < hint.cost:
            raise HTTPException(status_code=400, detail=f"Not enough points (need {hint.cost})")
        current_user.points -= hint.cost
        deducted = hint.cost

    db.add(models.QuestionHintUnlock(user_id=current_user.id, hint_id=hint_id))
    db.commit()
    return {"content": hint.content, "already_unlocked": False, "points_deducted": deducted}


# ═══════════════════════════════════════════════════════════════════
#  PROGRESS RETRIEVAL
# ═══════════════════════════════════════════════════════════════════

@router.delete("/room-answers/{room_id}")
def reset_room_progress(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Delete all of the current user's answers and progress for a room.
    Allows a learner to restart a lab from scratch.
    """
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    question_ids = [q.id for task in room.tasks for q in task.questions]
    task_ids     = [task.id for task in room.tasks]

    # Delete all question answers
    deleted = db.query(models.UserQuestionAnswer).filter(
        models.UserQuestionAnswer.user_id == current_user.id,
        models.UserQuestionAnswer.question_id.in_(question_ids),
    ).delete(synchronize_session=False)

    # Delete task progress
    db.query(models.UserTaskProgress).filter(
        models.UserTaskProgress.user_id == current_user.id,
        models.UserTaskProgress.task_id.in_(task_ids),
    ).delete(synchronize_session=False)

    # Delete room progress
    db.query(models.UserRoomProgress).filter(
        models.UserRoomProgress.user_id == current_user.id,
        models.UserRoomProgress.room_id == room_id,
    ).delete(synchronize_session=False)

    # Deduct XP that was awarded for this room completion
    room_prog = db.query(models.UserRoomProgress).filter(
        models.UserRoomProgress.user_id == current_user.id,
        models.UserRoomProgress.room_id == room_id,
    ).first()
    if room_prog and room_prog.is_completed:
        user = db.query(models.User).filter(models.User.id == current_user.id).first()
        if user:
            user.points = max(0, user.points - (room.xp_reward or 0))

    db.commit()
    return {"reset": True, "answers_deleted": deleted}


@router.get("/room/{room_id}")
def get_room_progress(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    prog = db.query(models.UserRoomProgress).filter(
        models.UserRoomProgress.user_id == current_user.id,
        models.UserRoomProgress.room_id == room_id,
    ).first()
    if not prog:
        return {"room_id": room_id, "is_completed": False, "score": 0, "tasks_done": 0}
    return schemas.UserRoomProgressOut.model_validate(prog)


@router.get("/room-answers/{room_id}")
def get_room_answers(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns all previously submitted correct answers for a learner in a room.
    Used by RoomLab to restore progress on page load / refresh / re-login.
    """
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Collect all question IDs in this room
    question_ids = [
        q.id
        for task in room.tasks
        for q in task.questions
    ]

    # Fetch all answers for this user in this room
    answers = db.query(models.UserQuestionAnswer).filter(
        models.UserQuestionAnswer.user_id == current_user.id,
        models.UserQuestionAnswer.question_id.in_(question_ids),
    ).all()

    result = {}
    for a in answers:
        # Only store the most recent answer per question
        existing = result.get(a.question_id)
        if existing is None or a.attempt_number > existing["attempt_number"]:
            result[a.question_id] = {
                "question_id":    a.question_id,
                "submitted_value": a.submitted_value,
                "submitted_data":  a.submitted_data,
                "is_correct":      a.is_correct,
                "points_awarded":  a.points_awarded,
                "attempt_number":  a.attempt_number,
            }

    return list(result.values())


@router.get("/leaderboard")
def leaderboard(db: Session = Depends(get_db),
                current_user: models.User = Depends(get_current_user)):
    users = db.query(models.User).filter(
        models.User.role == models.Role.LEARNER
    ).order_by(models.User.points.desc()).limit(50).all()
    return [schemas.LeaderboardEntry(name=u.name, institution=u.institution, points=u.points)
            for u in users]
