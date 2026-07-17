# AutoRange Cyber Range — Security Hardening Guide

## Overview

This document outlines the security improvements implemented in v2.1 of AutoRange Cyber Range and provides best practices for secure deployment and operation.

---

## Security Improvements Implemented

### 1. CORS (Cross-Origin Resource Sharing)

**Issue**: Previously allowed all origins with `allow_origins=["*"]`

**Fix**: 
- CORS now restricted to specific allowed origins via `ALLOWED_ORIGINS` environment variable
- Default: `http://localhost:5173` (development only)
- Production: Set to your frontend domain(s)

```bash
# .env
ALLOWED_ORIGINS=https://app.example.com,https://platform.example.com
```

### 2. Security Headers

Added comprehensive security headers via `SecurityHeadersMiddleware`:

- **X-Frame-Options: DENY** — Prevents clickjacking attacks
- **X-Content-Type-Options: nosniff** — Prevents MIME type sniffing
- **X-XSS-Protection: 1; mode=block** — Enables XSS protection
- **Referrer-Policy: strict-origin-when-cross-origin** — Controls referrer information
- **Permissions-Policy** — Restricts access to browser features (geolocation, camera, etc.)
- **Strict-Transport-Security** — Forces HTTPS in production
- **Content-Security-Policy** — Controls resource loading

### 3. Rate Limiting

Implemented using `slowapi` to prevent brute-force and DoS attacks:

- **Login endpoint**: 10 requests per minute per IP
- **Registration endpoint**: 5 requests per minute per IP
- Default global limit: 100 requests per minute

Add rate limiting to any endpoint:
```python
@router.post("/endpoint")
@limiter.limit("5/minute")
def my_endpoint(request, ...):
    pass
```

### 4. Authentication & Authorization

Enhanced with:

- **Audit logging** of all authentication events (login, register, failed attempts)
- **Inactive user check** — Prevents login for deactivated accounts
- **Role-based access control** — Strict permission checking for admin endpoints
- **JWT token validation** — Improved error handling and logging

### 5. Input Validation

New utility functions in `security.py`:

- **`sanitize_string()`** — Removes null bytes, limits length
- **`validate_email()`** — Validates email format and converts to lowercase
- **`validate_password()`** — Enforces minimum requirements:
  - At least 8 characters
  - At least one uppercase letter
  - At least one digit

Usage example:
```python
from security import validate_email, validate_password

try:
    email = validate_email(user_input)
    password = validate_password(user_input)
except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))
```

### 6. Audit Logging

Comprehensive audit trail system (`audit_logging.py`):

- Logs all sensitive operations with JSON format
- Tracks: user ID, action, resource, timestamp, status, duration
- File-based storage: `logs/audit.log`

Example:
```python
from security import log_audit

log_audit("CHALLENGE_SUBMIT", user_id=user.id, 
          resource=challenge_id, details={"points": 100}, status="success")
```

### 7. Environment Variable Validation

Secure configuration via environment variables:

- **SECRET_KEY** — Must be set in production (32+ random characters)
- **ENVIRONMENT** — Enforce production-only settings
- **ALLOWED_ORIGINS** — CORS whitelist
- **TOKEN_EXPIRE_MINUTES** — JWT expiration time

See `.env.example` for all required variables.

---

## Security Best Practices

### For Deployment

1. **Generate Strong Secret Key**
   ```bash
   openssl rand -hex 32
   ```
   Store securely and never commit to version control.

2. **Use HTTPS Only**
   - Set `ENVIRONMENT=production`
   - Use a reverse proxy (nginx, Apache) with SSL/TLS
   - Ensure `Strict-Transport-Security` header is sent

3. **Database Security**
   - Use strong passwords
   - Restrict database access to application server only
   - Enable SSL connections
   - Regular backups with encryption

4. **Secret Management**
   - Never commit `.env` to git (already in `.gitignore`)
   - Use environment variable management systems (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)
   - Rotate secrets regularly

5. **CORS Configuration**
   ```bash
   # Production example
   ALLOWED_ORIGINS=https://app.example.com,https://platform.example.com
   ```

### For Development

1. **Use `.env` file locally**
   ```bash
   cp .env.example .env
   # Edit .env with your local values
   ```

2. **Verify Environment**
   ```python
   # Warnings appear if insecure settings are used
   python -m app.seed  # Check startup logs
   ```

3. **Enable Debug Logging**
   ```bash
   LOG_LEVEL=DEBUG
   ```

### Ongoing Maintenance

1. **Regular Security Audits**
   - Review audit logs weekly for suspicious patterns
   - Check rate limiting effectiveness

2. **Dependency Updates**
   ```bash
   pip list --outdated
   pip install --upgrade -r requirements.txt
   ```

3. **Monitor Failed Attempts**
   - Failed login attempts logged with user email
   - Set up alerts for multiple failed attempts from same IP
   - Consider implementing account lockout after N failures

4. **Audit Log Analysis**
   ```bash
   # View recent audit events
   tail -f logs/audit.log | grep AUTH_LOGIN_FAILED
   
   # Analyze unauthorized actions
   grep "UNAUTHORIZED_ACTION" logs/audit.log
   ```

---

## Common Vulnerabilities & Mitigations

### SQL Injection
- ✅ Using SQLAlchemy ORM prevents SQL injection
- ✅ Never construct raw SQL queries with user input
- ✅ Use parameterized queries only

### Cross-Site Scripting (XSS)
- ✅ Frontend uses React with automatic escaping
- ✅ Content-Security-Policy header restricts inline scripts
- ⚠️ Avoid `dangerouslySetInnerHTML` in React components

### Cross-Site Request Forgery (CSRF)
- ℹ️ Token-based authentication (Bearer tokens) inherent protection
- ℹ️ SameSite cookies configured by browser

### Brute Force Attacks
- ✅ Rate limiting on login/registration endpoints
- ✅ Audit logging of failed attempts
- ⚠️ Consider implementing account lockout

### Information Disclosure
- ✅ Generic error messages (never expose internal details to clients)
- ✅ Detailed errors logged server-side only
- ⚠️ Review error responses to avoid leaking sensitive info

### Insecure Direct Object References (IDOR)
- ✅ User ownership checks on all resources
- ✅ Authorization checks on admin endpoints
- ⚠️ Always verify `current_user` has access to requested resource

---

## Endpoint Security Summary

| Endpoint | Rate Limit | Auth Required | Role Required | Audit Logged |
|----------|-----------|---------------|---------------|--------------|
| POST /auth/login | 10/min | No | — | ✅ |
| POST /auth/register | 5/min | No | — | ✅ |
| GET /auth/me | — | ✅ | — | — |
| PATCH /admin/users/:id/role | — | ✅ | admin | ✅ |
| GET /admin/stats | — | ✅ | admin | ✅ |
| POST /challenges | — | ✅ | tutor/admin | ✅ |

---

## Frontend Security Recommendations

### 1. HTTPS Enforcement
- Configure your hosting to redirect HTTP to HTTPS
- Set Strict-Transport-Security header

### 2. Content Security Policy (CSP)
Already configured server-side; additionally:
- Avoid inline scripts
- Use separate .js files
- Don't use `eval()` or `dangerouslySetInnerHTML`

### 3. Dependency Security
```bash
cd frontend
npm audit
npm audit fix
```

### 4. Environment Variables
Never expose API endpoints or keys in frontend code:
```javascript
// ✅ Good: Use relative URLs
const response = await fetch('/api/challenges')

// ❌ Bad: Hardcoded production URL
const response = await fetch('https://api.production.com/challenges')
```

---

## Monitoring & Alerts

### Recommended Alerts

1. **Failed login attempts** (> 5 in 5 minutes)
2. **Rate limit exceeded** (> 10 times per hour)
3. **Unauthorized actions** (any attempt)
4. **Admin role changes** (immediate notification)
5. **System errors** (>100 per hour)

### Log Analysis Tools

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Splunk** — Security information and event management
- **CloudWatch** (AWS) or **Azure Monitor** (Microsoft)

---

## Incident Response

### If a Security Breach is Suspected

1. **Immediate Actions**
   - Revoke all active tokens (hard logout)
   - Rotate SECRET_KEY
   - Review audit logs for unauthorized access
   - Disable affected user accounts

2. **Investigation**
   - Check audit logs for suspicious patterns
   - Review rate limiting events
   - Identify compromised credentials

3. **Recovery**
   - Force password resets for affected users
   - Audit all admin actions
   - Enable stricter rate limiting temporarily
   - Increase logging verbosity

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [SQLAlchemy Security](https://docs.sqlalchemy.org/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Last Updated**: 2026-07-17  
**Version**: 2.1
