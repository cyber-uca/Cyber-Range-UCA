"""
Tests for admin endpoints and authorization.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app import models


class TestAdminAuthorization:
    """Test admin endpoint authorization."""
    
    def test_admin_stats_requires_authentication(self, client: TestClient):
        """Admin stats endpoint requires authentication."""
        response = client.get("/api/admin/stats")
        assert response.status_code == 403
    
    def test_admin_stats_requires_admin_role(self, client: TestClient, learner_headers: dict):
        """Admin stats endpoint requires admin role."""
        response = client.get("/api/admin/stats", headers=learner_headers)
        assert response.status_code == 403
    
    def test_admin_stats_accessible_to_admin(self, client: TestClient, admin_headers: dict):
        """Admin stats should be accessible to admin users."""
        response = client.get("/api/admin/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_paths" in data
    
    def test_list_users_requires_admin(self, client: TestClient, learner_headers: dict):
        """List users endpoint requires admin role."""
        response = client.get("/api/admin/users", headers=learner_headers)
        assert response.status_code == 403
    
    def test_list_users_accessible_to_admin(self, client: TestClient, admin_headers: dict, test_learner: models.User):
        """List users should return all users for admin."""
        response = client.get("/api/admin/users", headers=admin_headers)
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        # Should include test_learner
        assert any(u["id"] == test_learner.id for u in users)
    
    def test_update_user_role_requires_admin(self, client: TestClient, learner_headers: dict, test_learner: models.User):
        """Update user role requires admin."""
        response = client.patch(
            f"/api/admin/users/{test_learner.id}/role",
            headers=learner_headers,
            json={"role": "tutor"}
        )
        assert response.status_code == 403
    
    def test_update_user_role_success(self, client: TestClient, admin_headers: dict, test_learner: models.User):
        """Admin should be able to update user role."""
        response = client.patch(
            f"/api/admin/users/{test_learner.id}/role",
            headers=admin_headers,
            json={"role": "tutor"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "tutor"
    
    def test_update_user_active_cannot_deactivate_self(self, client: TestClient, admin_headers: dict, test_admin: models.User):
        """Admin cannot deactivate their own account."""
        response = client.patch(
            f"/api/admin/users/{test_admin.id}/active",
            headers=admin_headers,
            json={"is_active": False}
        )
        assert response.status_code == 400
        assert "cannot deactivate" in response.json()["detail"].lower()
    
    def test_update_user_active_success(self, client: TestClient, admin_headers: dict, test_learner: models.User):
        """Admin should be able to deactivate another user."""
        response = client.patch(
            f"/api/admin/users/{test_learner.id}/active",
            headers=admin_headers,
            json={"is_active": False}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False
    
    def test_update_nonexistent_user_role(self, client: TestClient, admin_headers: dict):
        """Updating role for non-existent user should fail."""
        response = client.patch(
            "/api/admin/users/nonexistent-id/role",
            headers=admin_headers,
            json={"role": "tutor"}
        )
        assert response.status_code == 404


class TestRoleBasedAccess:
    """Test role-based access control across endpoints."""
    
    def test_learner_cannot_access_admin_endpoints(self, client: TestClient, learner_headers: dict):
        """Learners should not access admin endpoints."""
        endpoints = [
            "/api/admin/stats",
            "/api/admin/users",
        ]
        for endpoint in endpoints:
            response = client.get(endpoint, headers=learner_headers)
            assert response.status_code == 403, f"Learner should not access {endpoint}"
    
    def test_tutor_cannot_access_admin_endpoints(self, client: TestClient, tutor_headers: dict):
        """Tutors should not access admin endpoints."""
        endpoints = [
            "/api/admin/stats",
            "/api/admin/users",
        ]
        for endpoint in endpoints:
            response = client.get(endpoint, headers=tutor_headers)
            assert response.status_code == 403, f"Tutor should not access {endpoint}"
    
    def test_admin_can_create_challenges(self, client: TestClient, admin_headers: dict, test_db: Session):
        """Admin should be able to create challenges."""
        # First create a category and difficulty
        category = models.Category(name="Security", slug="security")
        difficulty = models.Difficulty(name="Beginner", slug="beginner", level=1)
        test_db.add(category)
        test_db.add(difficulty)
        test_db.commit()
        
        response = client.post(
            "/api/challenges",
            headers=admin_headers,
            json={
                "title": "Test Challenge",
                "description": "Test Description",
                "objectives": ["Learn security"],
                "category_id": category.id,
                "difficulty_id": difficulty.id,
                "challenge_type": "flag",
                "points": 100,
                "time_limit_minutes": 60,
                "flag": "FLAG{test}",
                "tags": ["security"],
                "hints": [],
                "vm_template_ids": []
            }
        )
        assert response.status_code == 200
    
    def test_learner_cannot_create_challenges(self, client: TestClient, learner_headers: dict):
        """Learners should not be able to create challenges."""
        response = client.post(
            "/api/challenges",
            headers=learner_headers,
            json={
                "title": "Test Challenge",
                "description": "Test Description",
                "objectives": ["Learn security"],
                "category_id": "cat-id",
                "difficulty_id": "diff-id",
                "challenge_type": "flag",
                "points": 100,
                "time_limit_minutes": 60,
                "flag": "FLAG{test}",
                "tags": [],
                "hints": [],
                "vm_template_ids": []
            }
        )
        assert response.status_code == 403
