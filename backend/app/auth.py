import os
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .database import get_db
from . import models
from .security import SECRET_KEY, log_audit
from .audit_logging import AuditLog, AUDIT_EVENTS

logger = logging.getLogger(__name__)

# Validate SECRET_KEY is sufficiently strong
if SECRET_KEY == "dev-secret-change-me-in-production":
    logger.warning("⚠️  Using development SECRET_KEY. Set SECRET_KEY environment variable in production.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("TOKEN_EXPIRE_MINUTES", "720"))  # 12 hours default

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            log_audit("TOKEN_VALIDATION_FAILED", details={"reason": "missing user_id"}, status="error")
            raise credentials_exception
    except JWTError as e:
        log_audit("TOKEN_VALIDATION_FAILED", details={"reason": str(e)}, status="error")
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None or not user.is_active:
        log_audit("AUTH_DENIED", user_id=user_id, details={"reason": "user not found or inactive"}, status="error")
        raise credentials_exception
    return user


def require_role(*allowed_roles: models.Role):
    def checker(user: models.User = Depends(get_current_user)) -> models.User:
        if user.role not in allowed_roles:
            log_audit(
                "UNAUTHORIZED_ACTION",
                user_id=user.id,
                details={"user_role": user.role, "required_roles": [r.value for r in allowed_roles]},
                status="error"
            )
            raise HTTPException(status_code=403, detail="Insufficient permissions for this action")
        return user
    return checker
