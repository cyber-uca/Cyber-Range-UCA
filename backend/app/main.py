from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine, test_connection
from .routers import auth, challenges, environments, vm_templates, tutor, admin, taxonomy, rooms

Base.metadata.create_all(bind=engine)
test_connection()

app = FastAPI(title="Cyber Range Framework API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your frontend's origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(challenges.router)
app.include_router(environments.router)
app.include_router(vm_templates.router)
app.include_router(tutor.router)
app.include_router(admin.router)
app.include_router(taxonomy.router)
app.include_router(rooms.router)


@app.get("/")
def health_check():
    return {"status": "ok"}
