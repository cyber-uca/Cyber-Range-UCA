"""
Security configuration and utilities for UCA CyRange.
Includes CORS, security headers, rate limiting, and input validation.
"""
import os
import logging
from typing import Optional, List
from datetime import datetime
from functools import wraps

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

# Get allowed origins from environment
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

# Validate SECRET_KEY is set in production
SECRET_KEY = os.getenv("SECRET_KEY", "")
if not SECRET_KEY:
    if os.getenv("ENVIRONMENT") == "production":
        raise ValueError("SECRET_KEY environment variable must be set in production")
    logger.warning("⚠️  Using insecure default SECRET_KEY. Set SECRET_KEY environment variable.")
    SECRET_KEY = "dev-secret-change-me-in-production"


def get_cors_config():
    """Return CORS configuration."""
    return {
        "allow_origins": ALLOWED_ORIGINS,
        "allow_credentials": True,
        "allow_methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["*"],
        "max_age": 600,
    }


# ═══════════════════════════════════════════════════════════════════════════
#  RATE LIMITING
# ═══════════════════════════════════════════════════════════════════════════

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except RateLimitExceeded:
            return {
                "detail": "Too many requests. Please try again later.",
                "status": 429,
            }


# ═══════════════════════════════════════════════════════════════════════════
#  SECURITY HEADERS MIDDLEWARE
# ═══════════════════════════════════════════════════════════════════════════

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Exempt documentation endpoints from strict CSP
        request_path = request.url.path
        is_docs_endpoint = request_path in ["/api-docs", "/api-redoc", "/api-openapi.json"]
        
        # Prevent clickjacking (but allow iframes for docs)
        if not is_docs_endpoint:
            response.headers["X-Frame-Options"] = "DENY"
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Enable XSS protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions policy (formerly Feature-Policy)
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Strict transport security (if HTTPS is enforced)
        if os.getenv("ENVIRONMENT") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # CSP header - relaxed for documentation endpoints
        if is_docs_endpoint:
            response.headers["Content-Security-Policy"] = "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'"
        else:
            response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
        
        return response


# ═══════════════════════════════════════════════════════════════════════════
#  INPUT VALIDATION
# ═══════════════════════════════════════════════════════════════════════════

def sanitize_string(value: str, max_length: int = 1000) -> str:
    """Sanitize string input to prevent injection attacks."""
    if not isinstance(value, str):
        raise ValueError("Input must be a string")
    
    # Remove null bytes
    value = value.replace("\x00", "")
    
    # Limit length
    if len(value) > max_length:
        raise ValueError(f"String exceeds maximum length of {max_length} characters")
    
    return value.strip()


def validate_email(email: str) -> str:
    """Validate and sanitize email address."""
    email = sanitize_string(email, max_length=256)
    
    # Basic email validation
    if "@" not in email or "." not in email.split("@")[1]:
        raise ValueError("Invalid email address")
    
    return email.lower()


def validate_password(password: str) -> str:
    """Validate password strength."""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    
    if not any(c.isupper() for c in password):
        raise ValueError("Password must contain at least one uppercase letter")
    
    if not any(c.isdigit() for c in password):
        raise ValueError("Password must contain at least one digit")
    
    return password


# ═══════════════════════════════════════════════════════════════════════════
#  AUDIT LOGGING UTILITIES
# ═══════════════════════════════════════════════════════════════════════════

audit_logger = logging.getLogger("audit")


def log_audit(action: str, user_id: Optional[str] = None, resource: Optional[str] = None, 
              details: Optional[dict] = None, status: str = "success"):
    """Log audit trail for security events."""
    audit_logger.info(
        f"AUDIT: {action} | user={user_id} | resource={resource} | status={status}",
        extra={
            "timestamp": datetime.utcnow().isoformat(),
            "action": action,
            "user_id": user_id,
            "resource": resource,
            "details": details or {},
            "status": status,
        }
    )


# ═══════════════════════════════════════════════════════════════════════════
#  COMMON SECURITY CHECKS
# ═══════════════════════════════════════════════════════════════════════════

def check_rate_limit(identifier: str, limit: int = 5, window: int = 60) -> bool:
    """Simple rate limit check (in production, use Redis)."""
    # This is a placeholder; implement with Redis in production
    return True


class TooManyRequestsException(HTTPException):
    def __init__(self, detail: str = "Too many requests"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
        )
