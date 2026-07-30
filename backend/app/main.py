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
from fastapi.openapi.utils import get_openapi

from .database import Base, engine, ensure_schema_upgrades, test_connection
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

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
ensure_schema_upgrades()
test_connection()

app = FastAPI(
    title="CyberForge API",
    version="2.0.0",
    description="OT/ICS Cybersecurity Learning Management System — Path→Module→Room→Task→Question",
    docs_url="/api-docs",
    redoc_url="/api-redoc",
    openapi_url="/api-openapi.json",
    contact={
        "name": "CyberForge Support",
        "email": "support@cyberforge.local",
        "url": "http://192.168.37.50",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_tags=[
        {
            "name": "auth",
            "description": "User authentication and account management",
        },
        {
            "name": "paths",
            "description": "Learning paths and modules",
        },
        {
            "name": "rooms",
            "description": "Challenge rooms and lab environments",
        },
        {
            "name": "environments",
            "description": "Virtual machine environments and provisioning",
        },
        {
            "name": "progress",
            "description": "User progress tracking and statistics",
        },
        {
            "name": "challenges",
            "description": "Challenge definitions and submission",
        },
        {
            "name": "admin",
            "description": "Administrative operations (admin only)",
        },
        {
            "name": "taxonomy",
            "description": "Challenge taxonomy (categories, difficulties, types)",
        },
        {
            "name": "vm-templates",
            "description": "Virtual machine templates (admin only)",
        },
    ],
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

# Add rate limiter state to app (global limits via middleware — avoid @limiter.limit on
# auth routes; its decorator breaks FastAPI's view of the request parameter)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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

# ── Routers ─────────────────────────────────────────────────────────────────

app.include_router(auth.router)          # /auth/...
app.include_router(paths.router)         # /paths/... + /paths/modules/...
app.include_router(rooms.router)         # /rooms/... + /rooms/tasks/... + /rooms/questions/...
app.include_router(environments.router)  # /environments/...
app.include_router(progress.router)      # /progress/...
app.include_router(admin.router)         # /admin/...
app.include_router(vm_templates.router)  # /vm-templates/...
app.include_router(taxonomy.router)      # /categories + /difficulties + /challenge-types

# Start background cleanup scheduler
from .routers.environments import start_cleanup_scheduler
start_cleanup_scheduler(app)
app.include_router(challenges.router)    # /challenges/...


# ── Health Check ────────────────────────────────────────────────────────────

@app.get("/", tags=["health"], summary="Health Check")
def health_check():
    """Check if the API is running and database is accessible."""
    return {"status": "ok", "version": "2.0.0"}


# ── Custom OpenAPI Swagger UI ──────────────────────────────────────────────

def custom_openapi():
    """Customize OpenAPI schema with enhanced documentation."""
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="CyberForge API",
        version="2.0.0",
        description="OT/ICS Cybersecurity Learning Management System",
        routes=app.routes,
    )
    
    # Add servers for documentation
    openapi_schema["servers"] = [
        {"url": "http://192.168.37.50/api", "description": "Local LAN Server"},
        {"url": "http://localhost:8000", "description": "Local Development"},
    ]
    
    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "Bearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT token from /auth/login endpoint",
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Configure Swagger UI parameters
app.swagger_ui_parameters = {
    "persistAuthorization": True,
    "displayOperationId": False,
    "filter": False,
    "showExtensions": False,
}
