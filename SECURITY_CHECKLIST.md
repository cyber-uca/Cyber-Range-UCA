# Security Hardening Checklist

Use this checklist to ensure the platform is securely deployed and configured.

## Pre-Deployment

- [ ] **SECRET_KEY**
  - [ ] Generated a strong random key: `openssl rand -hex 32`
  - [ ] Set `SECRET_KEY` environment variable
  - [ ] Verified it's NOT the development default
  - [ ] Stored securely (not in git, use secrets management)

- [ ] **CORS Configuration**
  - [ ] Set `ALLOWED_ORIGINS` to production frontend URL(s)
  - [ ] Tested CORS restrictions work correctly
  - [ ] Verified wildcard `*` is NOT used in production

- [ ] **Database Security**
  - [ ] Strong database password set
  - [ ] Database access restricted to application server only
  - [ ] SSL/TLS enabled for database connections
  - [ ] Regular backup process configured
  - [ ] Backups encrypted and stored securely

- [ ] **Environment Variables**
  - [ ] All `.env` values set (see `.env.example`)
  - [ ] `ENVIRONMENT=production`
  - [ ] `LOG_LEVEL=INFO` (not DEBUG in production)
  - [ ] Verified using environment management system (not hardcoded)

- [ ] **Dependencies**
  - [ ] All packages up to date: `pip list --outdated`
  - [ ] Security vulnerability scan passed: `pip install -U safety && safety check`
  - [ ] Frontend dependencies scanned: `npm audit`

## Deployment

- [ ] **HTTPS/TLS**
  - [ ] SSL certificate installed and valid
  - [ ] HTTPS redirects from HTTP (port 80 → 443)
  - [ ] Strong TLS version enforced (1.2+ minimum)
  - [ ] Certificate auto-renewal configured

- [ ] **Web Server Configuration**
  - [ ] Running behind reverse proxy (nginx, Apache, etc.)
  - [ ] Security headers added (X-Frame-Options, CSP, etc.)
  - [ ] Gzip compression enabled
  - [ ] File upload size limits enforced
  - [ ] Request timeout configured

- [ ] **Logging & Monitoring**
  - [ ] Audit logs enabled and monitored
  - [ ] Application logs centralized and monitored
  - [ ] Alerts configured for:
    - [ ] Failed login attempts (> 5 in 5 min)
    - [ ] Rate limit exceeded events
    - [ ] Unauthorized actions
    - [ ] System errors (>100/hour)

- [ ] **Access Control**
  - [ ] Admin accounts have strong passwords
  - [ ] Admin users limited to necessary personnel
  - [ ] SSH access restricted (key-based auth only)
  - [ ] Database access restricted to app servers
  - [ ] Backup storage access restricted

## Post-Deployment

- [ ] **Initial Testing**
  - [ ] Login/registration working correctly
  - [ ] Rate limiting functioning (test with repeated requests)
  - [ ] Admin endpoints require authentication
  - [ ] CORS correctly restricts origins
  - [ ] Security headers present in responses

- [ ] **Security Verification**
  - [ ] Run `curl -I https://your-domain/api/` and verify security headers:
    - [ ] X-Frame-Options: DENY
    - [ ] X-Content-Type-Options: nosniff
    - [ ] Strict-Transport-Security (production only)
  - [ ] Test failed login audit logging
  - [ ] Verify secrets are not exposed in logs

- [ ] **Monitoring Setup**
  - [ ] Log aggregation tool configured (ELK, Splunk, etc.)
  - [ ] Dashboards created for:
    - [ ] Failed authentication attempts
    - [ ] Rate limiting events
    - [ ] API response times
    - [ ] Error rates
  - [ ] On-call alerting configured

## Ongoing Maintenance (Monthly)

- [ ] Review audit logs for suspicious patterns
- [ ] Check for failed login attempts from known malicious IPs
- [ ] Verify all backups are current and restorable
- [ ] Review user list and remove inactive accounts
- [ ] Update documentation with any security changes

## Ongoing Maintenance (Quarterly)

- [ ] Security vulnerability scan (`safety check`, `npm audit`)
- [ ] Update all dependencies to latest stable versions
- [ ] Review and rotate secrets if necessary
- [ ] Audit admin user access and permissions
- [ ] Review security logs and patterns
- [ ] Test disaster recovery procedure

## Ongoing Maintenance (Annually)

- [ ] Full security audit by external firm (recommended)
- [ ] Penetration testing
- [ ] Review and update security policies
- [ ] Staff security training
- [ ] Update disaster recovery plan

## Quick Verification Commands

Test CORS restrictions:
```bash
curl -H "Origin: http://bad-domain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS https://your-domain/api/challenges -v
# Should show Access-Control-Allow-Origin with specific origin, not *
```

Test rate limiting:
```bash
# Should succeed first 10 times, then fail
for i in {1..15}; do
  curl -X POST https://your-domain/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"test"}' \
       -w "Status: %{http_code}\n"
done
```

Test security headers:
```bash
curl -I https://your-domain/api/ | grep -E "X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security"
```

Check audit logs:
```bash
# View recent audit events
tail -f logs/audit.log | jq .

# Find failed logins
grep "AUTH_LOGIN_FAILED" logs/audit.log | jq .
```

---

**Last Updated**: 2026-07-17
