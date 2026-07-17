"""
AutoRange Cyber Range — FastAPI application entry point.
New architecture: Path → Module → Room → Task → Question
"""
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .database import Base, engine, test_connection
from .security import (
    get_cors_config,
    SecurityHeadersMiddleware,
    limiter,
    ALLOWED_ORIGINS,
)
from .audit_logging import setup_audit_logging
from .routers import auth, paths, rooms, environments, progress, admin, vm_templates, taxonomy, challenges

# Setup logging
logging.basicConfig(level=logging.INFO)
setup_audit_logging()

# Create all tables
Base.metadata.create_all(bind=engine)
test_connection()

app = FastAPI(
    title="AutoRange Cyber Range API",
    version="2.0.0",
    description="OT/ICS Cybersecurity Learning Management System — Path→Module→Room→Task→Question",
)

# ── Security Middleware ────────────────────────────────────────────────────
# Add security headers middleware FIRST (it wraps everything)
app.add_middleware(SecurityHeadersMiddleware)

# Add CORS with restricted origins
cors_config = get_cors_config()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_config["allow_origins"],
    allow_credentials=cors_config["allow_credentials"],
    allow_methods=cors_config["allow_methods"],
    allow_headers=cors_config["allow_headers"],
    max_age=cors_config["max_age"],
)

# Add rate limiter state to app
app.state.limiter = limiter

# ── Exception Handlers ──────────────────────────────────────────────────────

logger = logging.getLogger(__name__)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Handle validation errors without exposing internal details."""
    logger.warning(f"Validation error on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=400,
        content={"detail": "Invalid request format. Please check your input."}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle unexpected errors securely."""
    logger.error(f"Unhandled exception on {request.url.path}: {str(exc)}", exc_info=exc)
    
    # In development, show full error; in production, show generic message
    if os.getenv("ENVIRONMENT") == "production":
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Our team has been notified."}
        )
    else:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(exc)}"}
        )
app.include_router(auth.router)          # /auth/...
app.include_router(paths.router)         # /paths/... + /paths/modules/...
app.include_router(rooms.router)         # /rooms/... + /rooms/tasks/... + /rooms/questions/...
app.include_router(environments.router)  # /environments/...
app.include_router(progress.router)      # /progress/...
app.include_router(admin.router)         # /admin/...
app.include_router(vm_templates.router)  # /vm-templates/...
app.include_router(taxonomy.router)      # /categories + /difficulties + /challenge-types
app.include_router(challenges.router)    # /challenges/...


@app.get("/")
def health_check():
    return {"status": "ok", "version": "2.0.0"}
