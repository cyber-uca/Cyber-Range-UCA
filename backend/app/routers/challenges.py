from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user, require_role
from ..gateway.challenge_type_gateway import get_challenge_type
from ..gateway.challenge_types.standard_flag import hash_flag

router = APIRouter(prefix="/challenges", tags=["challenges"])


@router.get("", response_model=List[schemas.ChallengeCard])
def list_challenges(
    category: Optional[str] = None,   # category slug, e.g. "offensive"
    difficulty: Optional[str] = None,  # difficulty slug, e.g. "beginner"
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Challenge).filter(models.Challenge.is_published == True)  # noqa: E712
    if category:
        q = q.join(models.Category).filter(models.Category.slug == category)
    if difficulty:
        q = q.join(models.Difficulty).filter(models.Difficulty.slug == difficulty)
    return q.all()


@router.get("/{challenge_id}", response_model=schemas.ChallengeDetail)
def get_challenge(challenge_id: str, db: Session = Depends(get_db),
                   current_user: models.User = Depends(get_current_user)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return challenge


@router.post("", response_model=schemas.ChallengeDetail)
def create_challenge(
    payload: schemas.ChallengeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    if not db.query(models.Category).filter(models.Category.id == payload.category_id).first():
        raise HTTPException(status_code=400, detail="Unknown category_id")
    if not db.query(models.Difficulty).filter(models.Difficulty.id == payload.difficulty_id).first():
        raise HTTPException(status_code=400, detail="Unknown difficulty_id")
    try:
        get_challenge_type(payload.challenge_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    challenge = models.Challenge(
        title=payload.title,
        description=payload.description,
        objectives=payload.objectives,
        category_id=payload.category_id,
        difficulty_id=payload.difficulty_id,
        challenge_type=payload.challenge_type,
        points=payload.points,
        time_limit_minutes=payload.time_limit_minutes,
        tags=payload.tags,
        flag_hash=hash_flag(payload.flag),
        created_by=current_user.id,
        is_published=False,
    )
    db.add(challenge)
    db.flush()

    for i, vm_template_id in enumerate(payload.vm_template_ids):
        db.add(models.ChallengeVM(
            challenge_id=challenge.id,
            vm_template_id=vm_template_id,
            canvas_x=100 + i * 180,
            canvas_y=150,
        ))

    for i, hint in enumerate(payload.hints):
        db.add(models.Hint(
            challenge_id=challenge.id,
            content=hint["content"],
            cost=hint.get("cost", 10),
            order=i,
        ))

    db.commit()
    db.refresh(challenge)
    return challenge


@router.get("/mine/list", response_model=List[schemas.ChallengeDetail])
def list_my_challenges(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    """Drafts and published challenges created by the current tutor/admin — powers the Challenge Creator list."""
    return db.query(models.Challenge).filter(models.Challenge.created_by == current_user.id).all()


@router.patch("/{challenge_id}", response_model=schemas.ChallengeDetail)
def update_challenge(
    challenge_id: str,
    payload: schemas.ChallengeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    challenge.title = payload.title
    challenge.description = payload.description
    challenge.objectives = payload.objectives
    challenge.category_id = payload.category_id
    challenge.difficulty_id = payload.difficulty_id
    challenge.challenge_type = payload.challenge_type
    challenge.points = payload.points
    challenge.time_limit_minutes = payload.time_limit_minutes
    challenge.tags = payload.tags
    if payload.flag:
        challenge.flag_hash = hash_flag(payload.flag)

    db.query(models.ChallengeVM).filter(models.ChallengeVM.challenge_id == challenge_id).delete()
    for i, vm_template_id in enumerate(payload.vm_template_ids):
        db.add(models.ChallengeVM(challenge_id=challenge_id, vm_template_id=vm_template_id,
                                   canvas_x=100 + i * 180, canvas_y=150))

    db.query(models.Hint).filter(models.Hint.challenge_id == challenge_id).delete()
    for i, hint in enumerate(payload.hints):
        db.add(models.Hint(challenge_id=challenge_id, content=hint["content"], cost=hint.get("cost", 10), order=i))

    db.commit()
    db.refresh(challenge)
    return challenge


@router.delete("/{challenge_id}")
def delete_challenge(
    challenge_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    db.delete(challenge)
    db.commit()
    return {"status": "deleted"}


@router.get("/{challenge_id}/export")
def export_challenge_pack(
    challenge_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    """
    Exports a challenge as a portable JSON pack - the unit of reuse for the
    framework. Categories/difficulties travel as slugs (not IDs, which are
    deployment-specific) and get matched or auto-created on import. The
    flag is NOT included (only its hash exists server-side) - importing
    requires setting a new flag.
    """
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    return {
        "pack_version": 2,
        "title": challenge.title,
        "description": challenge.description,
        "objectives": challenge.objectives,
        "category_slug": challenge.category.slug,
        "category_name": challenge.category.name,
        "category_color": challenge.category.color,
        "difficulty_slug": challenge.difficulty.slug,
        "difficulty_name": challenge.difficulty.name,
        "challenge_type": challenge.challenge_type,
        "points": challenge.points,
        "time_limit_minutes": challenge.time_limit_minutes,
        "tags": challenge.tags,
        "vm_templates": [
            {"name": v.vm_template.name, "zone": v.vm_template.zone, "canvas_x": v.canvas_x, "canvas_y": v.canvas_y}
            for v in challenge.vms
        ],
        "hints": [{"content": h.content, "cost": h.cost, "order": h.order} for h in challenge.hints],
    }


@router.post("/import", response_model=schemas.ChallengeDetail)
def import_challenge_pack(
    payload: schemas.ChallengeImport,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    """
    Imports a challenge pack. VM templates are matched by name and skipped
    (not failed) if missing on this deployment. Categories/difficulties are
    matched by slug and auto-created if this deployment doesn't have them
    yet - this is what makes packs truly portable across institutions with
    different taxonomies, instead of failing on an unknown enum value.
    """
    pack = payload.pack
    if pack.get("pack_version") not in (1, 2):
        raise HTTPException(status_code=400, detail="Unsupported pack version")

    category_slug = pack.get("category_slug") or pack.get("category")  # v1 packs used "category"
    category = db.query(models.Category).filter(models.Category.slug == category_slug).first()
    if not category:
        category = models.Category(
            slug=category_slug,
            name=pack.get("category_name", category_slug.title()),
            color=pack.get("category_color", "coral"),
        )
        db.add(category)
        db.flush()

    difficulty_slug = pack.get("difficulty_slug") or pack.get("difficulty")
    difficulty = db.query(models.Difficulty).filter(models.Difficulty.slug == difficulty_slug).first()
    if not difficulty:
        difficulty = models.Difficulty(slug=difficulty_slug, name=pack.get("difficulty_name", difficulty_slug.title()))
        db.add(difficulty)
        db.flush()

    challenge_type = pack.get("challenge_type", "standard_flag")
    try:
        get_challenge_type(challenge_type)
    except ValueError:
        challenge_type = "standard_flag"  # fall back rather than fail the whole import

    challenge = models.Challenge(
        title=pack["title"],
        description=pack["description"],
        objectives=pack.get("objectives"),
        category_id=category.id,
        difficulty_id=difficulty.id,
        challenge_type=challenge_type,
        points=pack.get("points", 100),
        time_limit_minutes=pack.get("time_limit_minutes", 90),
        tags=pack.get("tags"),
        flag_hash=hash_flag(payload.flag),
        created_by=current_user.id,
        is_published=False,
    )
    db.add(challenge)
    db.flush()

    skipped_templates = []
    for i, vm in enumerate(pack.get("vm_templates", [])):
        template = db.query(models.VMTemplate).filter(models.VMTemplate.name == vm["name"]).first()
        if not template:
            skipped_templates.append(vm["name"])
            continue
        db.add(models.ChallengeVM(challenge_id=challenge.id, vm_template_id=template.id,
                                   canvas_x=vm.get("canvas_x", 100 + i * 180), canvas_y=vm.get("canvas_y", 150)))

    for hint in pack.get("hints", []):
        db.add(models.Hint(challenge_id=challenge.id, content=hint["content"],
                            cost=hint.get("cost", 10), order=hint.get("order", 0)))

    db.commit()
    db.refresh(challenge)
    if skipped_templates:
        challenge.description += f"\n\n[Import note: VM templates not found on this deployment and skipped: {', '.join(skipped_templates)}]"
        db.commit()
        db.refresh(challenge)
    return challenge


@router.post("/{challenge_id}/publish", response_model=schemas.ChallengeDetail)
def publish_challenge(
    challenge_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.Role.TUTOR, models.Role.ADMIN)),
):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    challenge.is_published = True
    db.commit()
    db.refresh(challenge)
    return challenge


@router.get("/{challenge_id}/hints", response_model=List[schemas.HintOut])
def list_hints(challenge_id: str, db: Session = Depends(get_db),
                current_user: models.User = Depends(get_current_user)):
    """Returns hint metadata (cost) but the frontend should only reveal
    `content` after the learner explicitly unlocks it and pays the cost -
    handle that transaction in a dedicated unlock endpoint for a real
    deployment. Simplified here for clarity."""
    return db.query(models.Hint).filter(models.Hint.challenge_id == challenge_id).order_by(models.Hint.order).all()


@router.post("/{challenge_id}/submit", response_model=schemas.FlagResult)
def submit_flag(
    challenge_id: str,
    payload: schemas.FlagSubmit,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    already_solved = db.query(models.FlagSubmission).filter(
        models.FlagSubmission.user_id == current_user.id,
        models.FlagSubmission.challenge_id == challenge_id,
        models.FlagSubmission.is_correct == True,  # noqa: E712
    ).first()
    if already_solved:
        return schemas.FlagResult(is_correct=True, points_awarded=0, message="Already solved - no points awarded again.")

    # Grading is delegated to whichever challenge type this challenge uses.
    # This router has no idea HOW grading works for a given type - it just
    # calls the gateway. Adding a new grading mechanic never touches this file.
    grader = get_challenge_type(challenge.challenge_type)
    is_correct, points_awarded = grader.grade(challenge, payload.value)

    submission = models.FlagSubmission(
        user_id=current_user.id,
        challenge_id=challenge_id,
        submitted_value=payload.value,
        is_correct=is_correct,
        points_awarded=points_awarded,
    )
    db.add(submission)

    if is_correct:
        current_user.points += points_awarded

    db.commit()

    message = "Correct! Flag accepted." if is_correct else "Incorrect flag - keep trying."
    return schemas.FlagResult(is_correct=is_correct, points_awarded=points_awarded, message=message)


@router.get("/meta/leaderboard", response_model=List[schemas.LeaderboardEntry])
def leaderboard(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    users = db.query(models.User).filter(models.User.role == models.Role.LEARNER) \
        .order_by(models.User.points.desc()).limit(50).all()
    return [schemas.LeaderboardEntry(name=u.name, institution=u.institution, points=u.points) for u in users]
