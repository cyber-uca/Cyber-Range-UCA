import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import hash_password, verify_password, create_access_token, get_current_user
from ..security import limiter, log_audit, validate_email, validate_password
from ..audit_logging import AUDIT_EVENTS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.Token)
@limiter.limit("5/minute")
def register(request: Request, payload: schemas.UserRegister, db: Session = Depends(get_db)):
    """Register a new user account with rate limiting."""
    try:
        # Validate inputs
        email = validate_email(payload.email)
        password = validate_password(payload.password)
        
        existing = db.query(models.User).filter(models.User.email == email).first()
        if existing:
            log_audit("AUTH_REGISTER", details={"reason": "email_already_exists", "email": email}, status="error")
            raise HTTPException(status_code=400, detail="An account with this email already exists")

        user = models.User(
            name=payload.name,
            email=email,
            institution=payload.institution,
            hashed_password=hash_password(password),
            role=models.Role.LEARNER,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token({"sub": user.id, "role": user.role.value})
        log_audit("AUTH_REGISTER", user_id=user.id, details={"email": email}, status="success")
        return schemas.Token(access_token=token, user=user)
    except ValueError as e:
        log_audit("AUTH_REGISTER", details={"reason": str(e)}, status="error")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        log_audit("AUTH_REGISTER", details={"error": str(e)}, status="error")
        raise HTTPException(status_code=500, detail="Registration failed")


@router.post("/login", response_model=schemas.Token)
@limiter.limit("10/minute")
def login(request: Request, payload: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login user with rate limiting and audit logging."""
    try:
        email = validate_email(payload.email)
        
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            log_audit("AUTH_LOGIN_FAILED", details={"reason": "user_not_found", "email": email}, status="error")
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        
        if not user.is_active:
            log_audit("AUTH_LOGIN_FAILED", user_id=user.id, details={"reason": "account_inactive"}, status="error")
            raise HTTPException(status_code=401, detail="Account is inactive")
        
        if not verify_password(payload.password, user.hashed_password):
            log_audit("AUTH_LOGIN_FAILED", user_id=user.id, details={"reason": "wrong_password"}, status="error")
            raise HTTPException(status_code=401, detail="Incorrect email or password")

        token = create_access_token({"sub": user.id, "role": user.role.value})
        log_audit("AUTH_LOGIN", user_id=user.id, details={"email": email}, status="success")
        return schemas.Token(access_token=token, user=user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        log_audit("AUTH_LOGIN_FAILED", details={"error": str(e)}, status="error")
        raise HTTPException(status_code=500, detail="Login failed")


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    """Get current user information."""
    return current_user
