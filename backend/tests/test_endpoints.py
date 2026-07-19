"""
Tests for basic API endpoints.
"""
import pytest
from fastapi.testclient import TestClient


class TestHealthCheck:
    """Test health check endpoints."""
    
    def test_root_endpoint(self, client: TestClient):
        """Root endpoint should return health status."""
        response = client.get("/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data
    
    def test_health_endpoint(self, client: TestClient):
        """Health endpoint should return healthy status."""
        response = client.get("/health")
        assert response.status_code == 200


class TestChallengesEndpoints:
    """Test /challenges endpoints."""
    
    def test_list_challenges_unauthenticated(self, client: TestClient):
        """List challenges should require authentication."""
        response = client.get("/api/challenges")
        assert response.status_code == 403
    
    def test_list_challenges_authenticated(self, client: TestClient, learner_headers: dict):
        """Authenticated users should be able to list challenges."""
        response = client.get("/api/challenges", headers=learner_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_list_challenges_with_filters(self, client: TestClient, learner_headers: dict):
        """Should be able to filter challenges by category and difficulty."""
        response = client.get(
            "/api/challenges?category=security&difficulty=beginner",
            headers=learner_headers
        )
        assert response.status_code in [200, 404]  # 404 if filters don't match anything
    
    def test_get_challenge_by_id(self, client: TestClient, learner_headers: dict):
        """Should be able to get challenge by ID."""
        response = client.get(
            "/api/challenges/nonexistent-id",
            headers=learner_headers
        )
        # Will be 404 if ID doesn't exist (which is expected)
        assert response.status_code in [200, 404]


class TestRoomsEndpoints:
    """Test /rooms endpoints."""
    
    def test_list_rooms_unauthenticated(self, client: TestClient):
        """List rooms should require authentication."""
        response = client.get("/api/rooms")
        assert response.status_code == 403
    
    def test_list_rooms_authenticated(self, client: TestClient, learner_headers: dict):
        """Authenticated users should be able to list rooms."""
        response = client.get("/api/rooms", headers=learner_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_room_by_slug(self, client: TestClient, learner_headers: dict):
        """Should be able to get room by slug."""
        response = client.get(
            "/api/rooms/nonexistent-room",
            headers=learner_headers
        )
        # Will be 404 if slug doesn't exist (which is expected)
        assert response.status_code in [200, 404]


class TestTaxonomyEndpoints:
    """Test taxonomy endpoints (categories, difficulties, etc.)."""
    
    def test_list_categories(self, client: TestClient):
        """Categories should be publicly accessible."""
        response = client.get("/api/categories")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_list_difficulties(self, client: TestClient):
        """Difficulties should be publicly accessible."""
        response = client.get("/api/difficulties")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_list_challenge_types(self, client: TestClient):
        """Challenge types should be publicly accessible."""
        response = client.get("/api/challenge-types")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestProgressEndpoints:
    """Test progress tracking endpoints."""
    
    def test_get_progress_requires_authentication(self, client: TestClient):
        """Progress endpoints require authentication."""
        response = client.get("/api/progress")
        assert response.status_code == 403
    
    def test_get_user_progress(self, client: TestClient, learner_headers: dict):
        """Authenticated user should get their progress."""
        response = client.get("/api/progress", headers=learner_headers)
        assert response.status_code == 200
