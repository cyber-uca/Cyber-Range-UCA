"""
AutoRange Cyber Range — FastAPI application entry point.
New architecture: Path → Module → Room → Task → Question
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine, test_connection
from .routers import auth, paths, rooms, environments, progress, admin, vm_templates, taxonomy, challenges

# Create all tables
Base.metadata.create_all(bind=engine)
test_connection()

app = FastAPI(
    title="AutoRange Cyber Range API",
    version="2.0.0",
    description="OT/ICS Cybersecurity Learning Management System — Path→Module→Room→Task→Question",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────
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
