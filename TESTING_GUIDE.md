# Testing Guide for UCA CyRange

Complete guide to running and writing tests for the platform.

## Table of Contents

1. [Setup](#setup)
2. [Running Tests](#running-tests)
3. [Test Coverage](#test-coverage)
4. [Writing Tests](#writing-tests)
5. [Test Structure](#test-structure)
6. [Common Patterns](#common-patterns)
7. [Troubleshooting](#troubleshooting)

---

## Setup

### Install Test Dependencies

```bash
cd /opt/cyberrange/app/backend

# Activate virtual environment
source venv/bin/activate

# Install testing packages
pip install -r requirements.txt

# Verify pytest is installed
pytest --version
```

### Test Dependencies Added

- `pytest==7.4.4` — Testing framework
- `pytest-asyncio==0.23.3` — Async support
- `pytest-cov==4.1.0` — Code coverage reports
- `httpx==0.27.0` — HTTP client for testing

---

## Running Tests

### Run All Tests

```bash
# Run all tests with verbose output
pytest -v

# Run tests with short output
pytest

# Run tests with minimal output
pytest -q
```

### Run Specific Test File

```bash
# Run only security tests
pytest tests/test_security.py -v

# Run only authentication tests
pytest tests/test_auth.py -v

# Run only endpoint tests
pytest tests/test_endpoints.py -v

# Run only admin tests
pytest tests/test_admin.py -v
```

### Run Specific Test Class

```bash
# Run all tests in TestInputValidation class
pytest tests/test_security.py::TestInputValidation -v

# Run all tests in TestAuthentication class
pytest tests/test_auth.py::TestAuthenticationEndpoints -v
```

### Run Specific Test

```bash
# Run single test
pytest tests/test_auth.py::TestAuthenticationEndpoints::test_login_success -v
```

### Run Tests with Coverage Report

```bash
# Generate coverage report
pytest --cov=app --cov-report=html

# This creates htmlcov/index.html with detailed coverage
# Open in browser: htmlcov/index.html

# Also print to terminal
pytest --cov=app --cov-report=term-missing
```

### Run Tests Matching Pattern

```bash
# Run all tests with 'login' in the name
pytest -k login -v

# Run all tests with 'password' in the name
pytest -k password -v

# Run all tests except slow ones
pytest -m "not slow" -v
```

---

## Test Coverage

### Coverage Report Targets

| Module | Target | Current |
|--------|--------|---------|
| `app/auth.py` | 90% | TBD |
| `app/routers/auth.py` | 85% | TBD |
| `app/routers/admin.py` | 85% | TBD |
| `app/security.py` | 95% | TBD |
| Overall | 80% | TBD |

### Generate Coverage Report

```bash
# Generate and view coverage
pytest --cov=app --cov-report=html --cov-report=term-missing

# View HTML report
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows
```

---

## Writing Tests

### Test File Structure

```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # Fixtures and configuration
│   ├── test_security.py         # Security features
│   ├── test_auth.py             # Authentication endpoints
│   ├── test_admin.py            # Admin endpoints
│   └── test_endpoints.py        # General API endpoints
```

### Test Class Structure

```python
class TestAuthenticationEndpoints:
    """Test /auth/* endpoints."""
    
    def test_login_success(self, client: TestClient, test_learner: models.User):
        """User should be able to login with correct credentials."""
        response = client.post(
            "/api/auth/login",
            json={"email": test_learner.email, "password": "learner123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
```

### Available Fixtures

From `conftest.py`, you can use:

**Database:**
- `test_db` — In-memory SQLite database

**Users:**
- `test_learner` — Learner user (email: learner@test.local)
- `test_tutor` — Tutor user (email: tutor@test.local)
- `test_admin` — Admin user (email: admin@test.local)
- `test_inactive_user` — Inactive user

**Tokens:**
- `learner_token` — JWT token for learner
- `tutor_token` — JWT token for tutor
- `admin_token` — JWT token for admin

**Headers:**
- `learner_headers` — Authorization headers for learner
- `tutor_headers` — Authorization headers for tutor
- `admin_headers` — Authorization headers for admin

**Client:**
- `client` — FastAPI TestClient

### Example Test

```python
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
```

---

## Test Structure

### Security Tests (`test_security.py`)

Tests for:
- Input validation (email, password, strings)
- Rate limiting
- Security headers
- Sanitization

**Example:**
```python
def test_validate_password_too_short(self):
    """Password shorter than 8 chars should fail."""
    with pytest.raises(ValueError, match="at least 8 characters"):
        validate_password("Short1")
```

### Authentication Tests (`test_auth.py`)

Tests for:
- User registration
- User login
- Token generation
- Password validation
- Inactive accounts

**Example:**
```python
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
```

### Admin Tests (`test_admin.py`)

Tests for:
- Admin authorization
- Role-based access control
- User management
- Admin-only endpoints

**Example:**
```python
def test_admin_stats_accessible_to_admin(self, client: TestClient, admin_headers: dict):
    """Admin stats should be accessible to admin users."""
    response = client.get("/api/admin/stats", headers=admin_headers)
    assert response.status_code == 200
```

### Endpoint Tests (`test_endpoints.py`)

Tests for:
- Health checks
- Challenge endpoints
- Room endpoints
- Taxonomy endpoints
- Progress endpoints

**Example:**
```python
def test_list_challenges_authenticated(self, client: TestClient, learner_headers: dict):
    """Authenticated users should be able to list challenges."""
    response = client.get("/api/challenges", headers=learner_headers)
    assert response.status_code == 200
```

---

## Common Patterns

### Testing Authentication Required

```python
def test_endpoint_requires_authentication(self, client: TestClient):
    """Endpoint should require authentication."""
    response = client.get("/api/protected-endpoint")
    assert response.status_code == 403
```

### Testing Role-Based Access

```python
def test_endpoint_requires_admin(self, client: TestClient, learner_headers: dict):
    """Endpoint should require admin role."""
    response = client.get("/api/admin/endpoint", headers=learner_headers)
    assert response.status_code == 403
```

### Testing with Valid Token

```python
def test_endpoint_with_token(self, client: TestClient, admin_headers: dict):
    """Endpoint should work with valid token."""
    response = client.get("/api/admin/endpoint", headers=admin_headers)
    assert response.status_code == 200
```

### Testing Request Validation

```python
def test_invalid_request_format(self, client: TestClient):
    """Invalid request should fail validation."""
    response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com"}  # Missing password
    )
    assert response.status_code == 422  # Validation error
```

### Testing Error Responses

```python
def test_error_message(self, client: TestClient, test_learner):
    """Error should include helpful message."""
    response = client.post(
        "/api/auth/login",
        json={"email": test_learner.email, "password": "wrong"}
    )
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()
```

---

## Troubleshooting

### Tests Won't Run

**Problem:** `ModuleNotFoundError: No module named 'app'`

**Solution:**
```bash
# Make sure you're in the backend directory
cd /opt/cyberrange/app/backend

# Make sure venv is activated
source venv/bin/activate

# Make sure pytest can find modules
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
pytest
```

### Database Connection Error

**Problem:** Tests fail with database connection error

**Solution:**
```bash
# Tests use in-memory SQLite, not MySQL
# If still failing, check conftest.py is in tests/ directory
ls tests/conftest.py

# Verify test database is created properly
pytest --setup-show tests/test_auth.py::TestAuthenticationEndpoints::test_login_success
```

### Tests Timeout

**Problem:** Tests hang or timeout

**Solution:**
```bash
# Run with explicit timeout
pytest --timeout=30 tests/

# Check for infinite loops or blocking operations
# Run individual test with more verbosity
pytest -vv tests/test_file.py::TestClass::test_function
```

### Import Errors in Tests

**Problem:** `ImportError: cannot import name 'models'`

**Solution:**
```bash
# Make sure __init__.py exists in app directory
touch app/__init__.py

# Make sure __init__.py exists in tests directory
touch tests/__init__.py

# Verify imports in conftest.py
cat tests/conftest.py | grep "^from app"
```

---

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

### Running Tests Before Commit

Create `pre-commit-hook.sh`:

```bash
#!/bin/bash
cd backend
source venv/bin/activate
pytest --tb=short
if [ $? -ne 0 ]; then
  echo "Tests failed. Commit aborted."
  exit 1
fi
```

Make it executable:
```bash
chmod +x pre-commit-hook.sh
```

---

## Test Metrics

### Current Test Coverage

Run this command to see current coverage:

```bash
pytest --cov=app --cov-report=term-missing --cov-report=html
```

Then open `htmlcov/index.html` in your browser.

### Test Execution Time

```bash
# Show slowest tests
pytest --durations=10

# Show all test times
pytest -v --durations=0
```

---

## Next Steps

1. **Run initial tests:**
   ```bash
   cd /opt/cyberrange/app/backend
   source venv/bin/activate
   pytest -v
   ```

2. **Check coverage:**
   ```bash
   pytest --cov=app --cov-report=term-missing
   ```

3. **Add more tests** for new features

4. **Set up CI/CD** with GitHub Actions or similar

5. **Aim for 80%+ coverage** before major releases

---

**Last Updated:** 2026-07-17
