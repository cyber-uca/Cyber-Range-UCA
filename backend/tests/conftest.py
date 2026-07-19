"""
Pytest configuration and fixtures for AutoRange Cyber Range API tests.
"""
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.auth import hash_password, create_access_token
from app import models


# ═══════════════════════════════════════════════════════════════════════════
#  DATABASE FIXTURES
# ═══════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="function")
def test_db():
    """Create an in-memory SQLite database for testing."""
    # Use SQLite in-memory database for fast tests
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    def override_get_db():
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    
    yield db
    
    db.close()
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def client(test_db: Session):
    """Create a test client with database fixtures."""
    return TestClient(app)


# ═══════════════════════════════════════════════════════════════════════════
#  USER FIXTURES
# ═══════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="function")
def test_learner(test_db: Session):
    """Create a test learner user."""
    user = models.User(
        name="Test Learner",
        email="learner@test.local",
        institution="Test School",
        hashed_password=hash_password("learner123"),
        role=models.Role.LEARNER,
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_tutor(test_db: Session):
    """Create a test tutor user."""
    user = models.User(
        name="Test Tutor",
        email="tutor@test.local",
        institution="Test School",
        hashed_password=hash_password("tutor123"),
        role=models.Role.TUTOR,
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_admin(test_db: Session):
    """Create a test admin user."""
    user = models.User(
        name="Test Admin",
        email="admin@test.local",
        institution="Test School",
        hashed_password=hash_password("admin123"),
        role=models.Role.ADMIN,
        is_active=True,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_inactive_user(test_db: Session):
    """Create an inactive test user."""
    user = models.User(
        name="Inactive User",
        email="inactive@test.local",
        institution="Test School",
        hashed_password=hash_password("inactive123"),
        role=models.Role.LEARNER,
        is_active=False,
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


# ═══════════════════════════════════════════════════════════════════════════
#  TOKEN FIXTURES
# ═══════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="function")
def learner_token(test_learner: models.User):
    """Create a valid JWT token for test learner."""
    return create_access_token({"sub": test_learner.id, "role": test_learner.role.value})


@pytest.fixture(scope="function")
def tutor_token(test_tutor: models.User):
    """Create a valid JWT token for test tutor."""
    return create_access_token({"sub": test_tutor.id, "role": test_tutor.role.value})


@pytest.fixture(scope="function")
def admin_token(test_admin: models.User):
    """Create a valid JWT token for test admin."""
    return create_access_token({"sub": test_admin.id, "role": test_admin.role.value})


# ═══════════════════════════════════════════════════════════════════════════
#  REQUEST HEADERS FIXTURES
# ═══════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="function")
def learner_headers(learner_token: str):
    """Authorization headers for test learner."""
    return {"Authorization": f"Bearer {learner_token}"}


@pytest.fixture(scope="function")
def tutor_headers(tutor_token: str):
    """Authorization headers for test tutor."""
    return {"Authorization": f"Bearer {tutor_token}"}


@pytest.fixture(scope="function")
def admin_headers(admin_token: str):
    """Authorization headers for test admin."""
    return {"Authorization": f"Bearer {admin_token}"}
