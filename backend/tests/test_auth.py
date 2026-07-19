"""
Tests for authentication endpoints and flows.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app import models


class TestAuthenticationEndpoints:
    """Test /auth/* endpoints."""
    
    def test_register_success(self, client: TestClient, test_db: Session):
        """User should be able to register with valid credentials."""
        response = client.post(
            "/api/auth/register",
            json={
                "name": "New User",
                "email": "newuser@test.local",
                "password": "ValidPass123",
                "institution": "Test School",
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "newuser@test.local"
        assert data["user"]["role"] == "learner"
    
    def test_register_duplicate_email(self, client: TestClient, test_learner: models.User):
        """Registering with existing email should fail."""
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Another User",
                "email": test_learner.email,  # Already exists
                "password": "ValidPass123",
                "institution": "Test School",
            }
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()
    
    def test_register_weak_password(self, client: TestClient):
        """Registering with weak password should fail."""
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Weak Pass User",
                "email": "weak@test.local",
                "password": "weak",  # Too short
                "institution": "Test School",
            }
        )
        assert response.status_code == 400
        assert "password" in response.json()["detail"].lower()
    
    def test_register_invalid_email(self, client: TestClient):
        """Registering with invalid email should fail."""
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Invalid Email User",
                "email": "notanemail",  # Invalid format
                "password": "ValidPass123",
                "institution": "Test School",
            }
        )
        assert response.status_code == 400
        assert "email" in response.json()["detail"].lower()
    
    def test_login_success(self, client: TestClient, test_learner: models.User):
        """User should be able to login with correct credentials."""
        response = client.post(
            "/api/auth/login",
            json={"email": test_learner.email, "password": "learner123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["id"] == test_learner.id
        assert data["user"]["role"] == "learner"
    
    def test_login_invalid_email(self, client: TestClient):
        """Login with non-existent email should fail."""
        response = client.post(
            "/api/auth/login",
            json={"email": "nonexistent@test.local", "password": "password"}
        )
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_login_wrong_password(self, client: TestClient, test_learner: models.User):
        """Login with wrong password should fail."""
        response = client.post(
            "/api/auth/login",
            json={"email": test_learner.email, "password": "wrongpassword"}
        )
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_login_inactive_user(self, client: TestClient, test_inactive_user: models.User):
        """Login with inactive account should fail."""
        response = client.post(
            "/api/auth/login",
            json={"email": test_inactive_user.email, "password": "inactive123"}
        )
        assert response.status_code == 401
        assert "inactive" in response.json()["detail"].lower()
    
    def test_get_me_authenticated(self, client: TestClient, learner_headers: dict, test_learner: models.User):
        """Authenticated user should be able to get their info."""
        response = client.get("/api/auth/me", headers=learner_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_learner.id
        assert data["email"] == test_learner.email
        assert data["role"] == "learner"
    
    def test_get_me_unauthenticated(self, client: TestClient):
        """Unauthenticated request should fail."""
        response = client.get("/api/auth/me")
        assert response.status_code == 403
    
    def test_get_me_invalid_token(self, client: TestClient):
        """Request with invalid token should fail."""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401
