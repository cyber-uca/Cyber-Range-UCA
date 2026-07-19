"""
Audit logging configuration and utilities.
Tracks sensitive operations for security and compliance.
"""
import logging
import logging.config
import json
import os
from datetime import datetime
from typing import Optional, Any, Dict
from pythonjsonlogger import jsonlogger


def setup_audit_logging():
    """Configure JSON-based audit logging."""
    
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Create audit logger
    audit_logger = logging.getLogger("audit")
    audit_logger.setLevel(logging.INFO)
    
    # File handler for audit trail
    audit_handler = logging.FileHandler("logs/audit.log")
    audit_handler.setLevel(logging.INFO)
    
    # JSON formatter for structured logging
    formatter = jsonlogger.JsonFormatter(
        '%(timestamp)s %(level)s %(action)s %(user_id)s %(resource)s %(status)s %(details)s'
    )
    audit_handler.setFormatter(formatter)
    
    audit_logger.addHandler(audit_handler)
    return audit_logger


class AuditLog:
    """Context manager for audit logging sensitive operations."""
    
    def __init__(
        self,
        action: str,
        user_id: Optional[str] = None,
        resource: Optional[str] = None,
        logger: Optional[logging.Logger] = None,
    ):
        self.action = action
        self.user_id = user_id
        self.resource = resource
        self.logger = logger or logging.getLogger("audit")
        self.details: Dict[str, Any] = {}
        self.status = "pending"
    
    def set_details(self, **kwargs):
        """Add details to the audit log."""
        self.details.update(kwargs)
    
    def __enter__(self):
        self.start_time = datetime.utcnow()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.status = "error" if exc_type else "success"
        duration_ms = (datetime.utcnow() - self.start_time).total_seconds() * 1000
        
        self.logger.info(
            json.dumps({
                "timestamp": self.start_time.isoformat(),
                "action": self.action,
                "user_id": self.user_id,
                "resource": self.resource,
                "status": self.status,
                "duration_ms": duration_ms,
                "error": str(exc_val) if exc_val else None,
                "details": self.details,
            })
        )
        return False  # Don't suppress exceptions


# ═══════════════════════════════════════════════════════════════════════════
#  AUDIT EVENT TYPES
# ═══════════════════════════════════════════════════════════════════════════

AUDIT_EVENTS = {
    # Authentication
    "AUTH_LOGIN": "User login",
    "AUTH_LOGIN_FAILED": "User login failed",
    "AUTH_REGISTER": "User registration",
    "AUTH_LOGOUT": "User logout",
    
    # User Management
    "USER_ROLE_CHANGE": "User role changed",
    "USER_DEACTIVATE": "User deactivated",
    "USER_DELETE": "User deleted",
    "USER_PASSWORD_CHANGE": "User password changed",
    
    # Challenge Management
    "CHALLENGE_CREATE": "Challenge created",
    "CHALLENGE_UPDATE": "Challenge updated",
    "CHALLENGE_DELETE": "Challenge deleted",
    "CHALLENGE_PUBLISH": "Challenge published",
    "CHALLENGE_SUBMIT": "Challenge submitted",
    
    # Admin Actions
    "ADMIN_SETTING_CHANGE": "Platform setting changed",
    "ADMIN_CONFIG_UPDATE": "Configuration updated",
    
    # Access Control
    "ACCESS_DENIED": "Access denied",
    "UNAUTHORIZED_ACTION": "Unauthorized action attempted",
}
