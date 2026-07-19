# API Documentation Guide

Interactive, auto-generated API documentation for the AutoRange Cyber Range platform.

## Table of Contents

1. [Accessing the Documentation](#accessing-the-documentation)
2. [Swagger UI Features](#swagger-ui-features)
3. [Making API Requests](#making-api-requests)
4. [Authentication](#authentication)
5. [API Endpoints Overview](#api-endpoints-overview)
6. [Error Handling](#error-handling)
7. [Try It Out](#try-it-out)
8. [Rate Limiting](#rate-limiting)

---

## Accessing the Documentation

### Swagger UI (Interactive)
```
http://192.168.37.50/api/docs
```
- Full interactive documentation
- "Try it out" button to test endpoints
- Request/response examples

### ReDoc (Alternative)
```
http://192.168.37.50/api/redoc
```
- Clean, readable API documentation
- Side-by-side request/response
- Search functionality

### OpenAPI Schema (JSON)
```
http://192.168.37.50/api/openapi.json
```
- Raw OpenAPI specification
- Use with tools like Postman, Insomnia

---

## Swagger UI Features

### 1. **Endpoint Organization**

Endpoints are organized by tags:

| Tag | Purpose |
|-----|---------|
| **auth** | Login, register, get current user |
| **paths** | Learning paths and modules |
| **rooms** | Challenge collections/labs |
| **environments** | VM environments and provisioning |
| **progress** | User progress and statistics |
| **challenges** | Challenge definitions |
| **admin** | Administrative operations |
| **taxonomy** | Categories, difficulties, types |
| **vm-templates** | VM template management |

### 2. **Request/Response Examples**

Each endpoint shows:
- ✅ **Request:** Parameters, headers, body schema
- ✅ **Response:** Success (200) and error responses
- ✅ **Schema:** Data types and validation rules

### 3. **Authentication**

See the "Bearer" button in the top-right to add JWT token:

```
Authorize
┌─────────────────────────────────────────────┐
│ Bearer Authentication                       │
│                                             │
│ [                                      ]   │
│  ↑ Paste JWT token here               │   │
│  (from /auth/login response)           │   │
└─────────────────────────────────────────────┘
```

---

## Making API Requests

### Step 1: Authenticate

1. Find the **POST /auth/login** endpoint
2. Click **"Try it out"**
3. Enter valid credentials:
   ```json
   {
     "email": "learner@test.local",
     "password": "learner123"
   }
   ```
4. Click **Execute**
5. Copy the `access_token` from the response

### Step 2: Authorize Subsequent Requests

1. Click the **"Authorize"** button (top-right)
2. Paste the token:
   ```
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Click **Authorize**
4. All subsequent requests will include this token

### Step 3: Make Requests

For any authenticated endpoint:

1. Click **"Try it out"**
2. Fill in parameters/body
3. Click **Execute**
4. See response (status, headers, body)

---

## Authentication

### Getting a Token

**POST /auth/register** (create new account)
```json
{
  "name": "John Learner",
  "email": "john@example.local",
  "password": "SecurePass123",
  "institution": "Test School"
}
```

**POST /auth/login** (existing user)
```json
{
  "email": "john@example.local",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "name": "John Learner",
    "email": "john@example.local",
    "role": "learner",
    "is_active": true
  }
}
```

### Token Usage

Add to request headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Or use the **Authorize** button in Swagger UI.

---

## API Endpoints Overview

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Create new account | ❌ |
| POST | `/auth/login` | Login and get token | ❌ |
| GET | `/auth/me` | Get current user profile | ✅ |

### Challenges (`/challenges`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/challenges` | List all challenges | ✅ |
| GET | `/challenges/{id}` | Get challenge details | ✅ |
| POST | `/challenges/{id}/submit` | Submit challenge answer | ✅ |

### Rooms (`/rooms`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/rooms` | List all rooms | ✅ |
| GET | `/rooms/{slug}` | Get room details | ✅ |

### Progress (`/progress`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/progress` | Get user's progress | ✅ |
| GET | `/progress/{id}` | Get specific progress | ✅ |

### Taxonomy (`/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/categories` | List categories (public) | ❌ |
| GET | `/difficulties` | List difficulties (public) | ❌ |
| GET | `/challenge-types` | List challenge types (public) | ❌ |

### Admin (`/admin`) — Admin Only

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/stats` | Platform statistics | ✅ Admin |
| GET | `/admin/users` | List all users | ✅ Admin |
| PUT | `/admin/users/{id}/role` | Change user role | ✅ Admin |

---

## Error Handling

### Common Error Responses

**400 Bad Request** — Invalid input
```json
{
  "detail": "Invalid request format. Please check your input."
}
```

**401 Unauthorized** — Missing or invalid token
```json
{
  "detail": "Not authenticated"
}
```

**403 Forbidden** — Insufficient permissions
```json
{
  "detail": "Not enough permissions"
}
```

**404 Not Found** — Resource doesn't exist
```json
{
  "detail": "Item not found"
}
```

**422 Unprocessable Entity** — Validation failed
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "Invalid email format",
      "type": "value_error"
    }
  ]
}
```

**429 Too Many Requests** — Rate limited
```json
{
  "detail": "Rate limit exceeded"
}
```

**500 Internal Server Error** — Server error
```json
{
  "detail": "Internal server error. Our team has been notified."
}
```

---

## Try It Out

### Test Authentication Flow

1. **Register:**
   - POST `/auth/register`
   - Fill in user details
   - Get token

2. **Login:**
   - POST `/auth/login`
   - Use credentials from registration
   - Copy `access_token`

3. **Get Profile:**
   - Click **Authorize**, paste token
   - GET `/auth/me`
   - See your user profile

4. **List Challenges:**
   - GET `/challenges`
   - View all available challenges

5. **Submit Answer:**
   - POST `/challenges/{id}/submit`
   - Enter your answer
   - Get feedback

---

## Rate Limiting

Certain endpoints have rate limits to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST `/auth/register` | 5 | Per minute |
| POST `/auth/login` | 10 | Per minute |
| POST `/challenges/submit` | 100 | Per minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1689873924
```

When rate limited:
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1689873924

{
  "detail": "Rate limit exceeded"
}
```

---

## Example Workflows

### Scenario 1: New User Registers and Takes Challenge

```bash
# 1. Register
curl -X POST "http://192.168.37.50/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "email": "alice@example.local",
    "password": "SecurePass123",
    "institution": "Security Academy"
  }'

# 2. Get token from response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. List challenges
curl -X GET "http://192.168.37.50/api/challenges" \
  -H "Authorization: Bearer $TOKEN"

# 4. Submit answer
curl -X POST "http://192.168.37.50/api/challenges/1/submit" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"answer": "FLAG{correct_flag}"}'

# 5. Check progress
curl -X GET "http://192.168.37.50/api/progress" \
  -H "Authorization: Bearer $TOKEN"
```

### Scenario 2: Admin Reviews Platform Statistics

```bash
# 1. Login as admin
curl -X POST "http://192.168.37.50/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.local",
    "password": "admin123"
  }'

# 2. Get statistics
curl -X GET "http://192.168.37.50/api/admin/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 3. List users
curl -X GET "http://192.168.37.50/api/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Integration with Tools

### Postman

1. Import OpenAPI: `http://192.168.37.50/api/openapi.json`
2. Create environment variable: `BASE_URL=http://192.168.37.50/api`
3. Set `token` variable from login response
4. Use `{{token}}` in Authorization header

### Insomnia

1. **Design** → **Import** → OpenAPI URL
2. Paste: `http://192.168.37.50/api/openapi.json`
3. Set authentication in request headers
4. Test endpoints

### cURL

See examples above, or export Swagger definition to OpenAPI format for other tools.

---

## Troubleshooting

### "Not authenticated" Error

- Copy token from login response (not the `token_type`)
- Use format: `Authorization: Bearer TOKEN`
- Token may have expired (login again)

### "Not enough permissions" Error

- Endpoint requires admin role
- Login with admin account
- Use admin token in Authorization

### "Rate limit exceeded" Error

- Wait for the time in `X-RateLimit-Reset` header
- Or use different endpoint
- See Rate Limiting section above

### Swagger UI Not Loading

- Check if app is running: `curl http://192.168.37.50/api/`
- Check CORS settings if accessing from different domain
- Verify URL: `http://192.168.37.50/api/docs` (note `/api` prefix)

---

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:

```
http://192.168.37.50/api/openapi.json
```

Use this with:
- **API clients:** Postman, Insomnia, REST Client
- **Code generation:** OpenAPI Generator, Swagger Codegen
- **Documentation:** Swagger UI, ReDoc
- **CI/CD:** Automated testing, contract verification

---

## Next Steps

1. ✅ Visit `http://192.168.37.50/api/docs`
2. ✅ Try registering a new account
3. ✅ Log in and get a token
4. ✅ Test some endpoints
5. ✅ Try the "Try it out" feature
6. ✅ Explore all endpoints

---

**Last Updated:** 2026-07-19
**API Version:** 2.0.0
**Environment:** Local LAN (192.168.37.50)
