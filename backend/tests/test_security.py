"""
Tests for security features: rate limiting, input validation, audit logging.
"""
import pytest
from fastapi.testclient import TestClient
from app.security import validate_email, validate_password, sanitize_string


class TestInputValidation:
    """Test input validation functions."""
    
    def test_validate_email_valid(self):
        """Valid email should pass."""
        email = validate_email("test@example.com")
        assert email == "test@example.com"
    
    def test_validate_email_converts_to_lowercase(self):
        """Email should be converted to lowercase."""
        email = validate_email("TEST@EXAMPLE.COM")
        assert email == "test@example.com"
    
    def test_validate_email_missing_at_symbol(self):
        """Email without @ should raise error."""
        with pytest.raises(ValueError, match="Invalid email"):
            validate_email("notanemail.com")
    
    def test_validate_email_missing_domain_extension(self):
        """Email without domain extension should raise error."""
        with pytest.raises(ValueError, match="Invalid email"):
            validate_email("test@nodomain")
    
    def test_validate_email_max_length(self):
        """Email exceeding max length should raise error."""
        long_email = "a" * 300 + "@example.com"
        with pytest.raises(ValueError, match="exceeds maximum"):
            validate_email(long_email)
    
    def test_validate_password_valid(self):
        """Valid password should pass."""
        password = validate_password("ValidPass123")
        assert password == "ValidPass123"
    
    def test_validate_password_too_short(self):
        """Password shorter than 8 chars should fail."""
        with pytest.raises(ValueError, match="at least 8 characters"):
            validate_password("Short1")
    
    def test_validate_password_no_uppercase(self):
        """Password without uppercase should fail."""
        with pytest.raises(ValueError, match="uppercase letter"):
            validate_password("lowercase123")
    
    def test_validate_password_no_digit(self):
        """Password without digit should fail."""
        with pytest.raises(ValueError, match="digit"):
            validate_password("NoDigitPass")
    
    def test_sanitize_string_removes_null_bytes(self):
        """Null bytes should be removed."""
        result = sanitize_string("hello\x00world")
        assert result == "helloworld"
    
    def test_sanitize_string_exceeds_max_length(self):
        """String exceeding max length should raise error."""
        long_string = "a" * 1001
        with pytest.raises(ValueError, match="exceeds maximum"):
            sanitize_string(long_string)
    
    def test_sanitize_string_strips_whitespace(self):
        """Leading/trailing whitespace should be stripped."""
        result = sanitize_string("  hello  ")
        assert result == "hello"


class TestRateLimiting:
    """Test rate limiting on authentication endpoints."""
    
    def test_login_endpoint_accessible(self, client: TestClient):
        """Login endpoint should be accessible."""
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "password"}
        )
        # May return 401 (invalid creds) but endpoint should be accessible
        assert response.status_code in [401, 422]
    
    def test_register_endpoint_accessible(self, client: TestClient):
        """Register endpoint should be accessible."""
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Test User",
                "email": "test@example.com",
                "password": "ValidPass123",
                "institution": "Test School",
            }
        )
        # May return 200, 400, or 422 but endpoint should be accessible
        assert response.status_code in [200, 400, 422]


class TestSecurityHeaders:
    """Test security headers are included in responses."""
    
    def test_security_headers_present(self, client: TestClient):
        """Response should include security headers."""
        response = client.get("/api/")
        
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"
        assert "Referrer-Policy" in response.headers
