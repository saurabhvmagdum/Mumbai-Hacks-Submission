# 🔒 Security & Bug Review Report
## Swasthya Health Intelligence Network

**Review Date**: 2024  
**Reviewer**: Automated Security Audit  
**Status**: ⚠️ **CRITICAL ISSUES FOUND**

---

## 📊 Executive Summary

This comprehensive security review identified **8 Critical**, **12 High Priority**, **15 Medium Priority** security vulnerabilities and bugs across the codebase. Immediate action is required before production deployment.

**Risk Level**: 🔴 **HIGH RISK**

---

## 🔴 CRITICAL SECURITY ISSUES

### 1. **Hardcoded Secrets in Code**
**Severity**: 🔴 CRITICAL  
**Location**: Multiple files

**Issues**:
- JWT secret fallback: `'your-secret-key'` in `backend/middleware/auth.js:11` and `backend/routes/auth.js:122`
- Database password hardcoded: `'swasthya2024'` in multiple files:
  - `backend/config/db.js:13`
  - `backend/scripts/init-db.js:17`
  - `backend/scripts/complete-test.js:12`
  - `backend/scripts/verify-users.js:12`
  - `backend/scripts/test-db-connection.js:22`
- JWT secret hardcoded in `backend/server-mock.js:8`: `'swasthya-super-secret-jwt-key-2024'`

**Impact**: 
- Secrets exposed in version control
- Anyone with code access can generate valid tokens
- Database credentials compromised

**Fix Plan**:
```javascript
// ❌ BAD
jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', ...)

// ✅ GOOD
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}
jwt.verify(token, process.env.JWT_SECRET, ...)
```

**Priority**: **IMMEDIATE** - Fix before any deployment

---

### 2. **CORS Misconfiguration**
**Severity**: 🔴 CRITICAL  
**Location**: `backend/server.js:14-17`

**Issue**:
```javascript
app.use(cors({
  origin: '*', // Allow all origins for development
  credentials: true
}))
```

**Impact**:
- Allows any website to make authenticated requests
- Credentials (cookies/tokens) can be sent to any origin
- CSRF attacks possible
- Data exfiltration risk

**Fix Plan**:
```javascript
// ✅ GOOD
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? process.env.ALLOWED_ORIGINS?.split(',') || []
  : ['http://localhost:8000', 'http://localhost:3000']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}))
```

**Priority**: **IMMEDIATE**

---

### 3. **No Rate Limiting**
**Severity**: 🔴 CRITICAL  
**Location**: All API routes

**Issue**: No rate limiting on authentication endpoints or API routes

**Impact**:
- Brute force attacks on login
- DDoS attacks possible
- API abuse
- Resource exhaustion

**Fix Plan**:
```bash
npm install express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/login', authLimiter, ...)
router.post('/register', authLimiter, ...)
```

**Priority**: **IMMEDIATE**

---

### 4. **Sensitive Data in Logs**
**Severity**: 🔴 CRITICAL  
**Location**: `backend/server.js:22-28`

**Issue**:
```javascript
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  console.log(`  Headers:`, JSON.stringify(req.headers, null, 2))
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`  Body:`, JSON.stringify(req.body, null, 2))
  }
  next()
})
```

**Impact**:
- Passwords logged in plain text
- Tokens exposed in logs
- Aadhaar numbers in logs
- GDPR/HIPAA violations
- Security audit trail compromised

**Fix Plan**:
```javascript
const sanitizeLogData = (data) => {
  const sensitive = ['password', 'token', 'aadhaar_number', 'authorization']
  const sanitized = { ...data }
  sensitive.forEach(key => {
    if (sanitized[key]) sanitized[key] = '***REDACTED***'
  })
  return sanitized
}

app.use((req, res, next) => {
  const sanitizedHeaders = sanitizeLogData(req.headers)
  const sanitizedBody = req.body ? sanitizeLogData(req.body) : {}
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  if (process.env.NODE_ENV === 'development') {
    console.log(`  Headers:`, JSON.stringify(sanitizedHeaders, null, 2))
    console.log(`  Body:`, JSON.stringify(sanitizedBody, null, 2))
  }
  next()
})
```

**Priority**: **IMMEDIATE**

---

### 5. **No Security Headers**
**Severity**: 🔴 CRITICAL  
**Location**: `backend/server.js`

**Issue**: No security headers middleware (helmet)

**Impact**:
- XSS attacks possible
- Clickjacking vulnerable
- MIME type sniffing
- No HSTS
- Information disclosure

**Fix Plan**:
```bash
npm install helmet
```

```javascript
import helmet from 'helmet'

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))
```

**Priority**: **IMMEDIATE**

---

### 6. **SQL Injection Risk**
**Severity**: 🔴 CRITICAL  
**Location**: `backend/scripts/init-db.js:54-57`

**Issue**:
```javascript
const patientUser = await pool.query(
  "SELECT user_id FROM users WHERE aadhaar_number = '123412341234'"
)
```

**Impact**: While this specific case uses hardcoded values, the pattern is dangerous. If variables are used without parameterization, SQL injection is possible.

**Fix Plan**: Always use parameterized queries (already done in routes, but ensure scripts follow same pattern)

**Priority**: **HIGH** (Low risk in current code, but pattern is dangerous)

---

### 7. **No Input Sanitization on Backend**
**Severity**: 🔴 CRITICAL  
**Location**: All route handlers

**Issue**: Backend relies only on express-validator, no additional sanitization

**Impact**:
- XSS attacks possible
- NoSQL injection (if MongoDB added later)
- Command injection
- Path traversal

**Fix Plan**:
```bash
npm install express-validator express-mongo-sanitize
```

```javascript
import mongoSanitize from 'express-mongo-sanitize'

app.use(mongoSanitize())
app.use(express.json({ limit: '10mb' })) // Add size limit
```

**Priority**: **IMMEDIATE**

---

### 8. **Missing Environment Variable Validation**
**Severity**: 🔴 CRITICAL  
**Location**: All files using `process.env`

**Issue**: No validation that required env vars exist

**Impact**:
- Application may start with invalid configuration
- Security misconfigurations
- Runtime errors in production

**Fix Plan**:
```javascript
// config/env.js
const requiredEnvVars = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
]

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`)
  }
})
```

**Priority**: **IMMEDIATE**

---

## 🟠 HIGH PRIORITY ISSUES

### 9. **No Request Size Limits**
**Severity**: 🟠 HIGH  
**Location**: `backend/server.js:18-19`

**Issue**: No explicit body size limits

**Impact**: DoS attacks via large payloads

**Fix**: Already partially fixed with `express.json()`, but add explicit limits:
```javascript
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
```

---

### 10. **Long JWT Expiration**
**Severity**: 🟠 HIGH  
**Location**: `backend/routes/auth.js:123`

**Issue**: JWT expires in 7 days (default)

**Impact**: Stolen tokens remain valid for too long

**Fix Plan**:
```javascript
// Shorter expiration
{ expiresIn: process.env.JWT_EXPIRES_IN || '1h' }

// Add refresh token mechanism
```

---

### 11. **No Refresh Token Mechanism**
**Severity**: 🟠 HIGH  
**Location**: Authentication system

**Issue**: Only access tokens, no refresh tokens

**Impact**: Users must re-login frequently, or tokens stay valid too long

**Fix Plan**: Implement refresh token rotation

---

### 12. **No CSRF Protection**
**Severity**: 🟠 HIGH  
**Location**: All POST/PUT/DELETE routes

**Issue**: No CSRF tokens

**Impact**: Cross-site request forgery attacks

**Fix Plan**:
```bash
npm install csurf
```

---

### 13. **No File Upload Validation on Backend**
**Severity**: 🟠 HIGH  
**Location**: File upload endpoints (if any)

**Issue**: Frontend validates, but backend doesn't

**Impact**: Malicious file uploads, path traversal

**Fix Plan**: Add multer with validation, file type checking, size limits

---

### 14. **Missing Error Details in Production**
**Severity**: 🟠 HIGH  
**Location**: Error handlers

**Issue**: Error messages may leak sensitive info

**Impact**: Information disclosure

**Fix Plan**:
```javascript
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  })
})
```

---

### 15. **No API Versioning**
**Severity**: 🟠 MEDIUM  
**Location**: API routes

**Issue**: No version prefix (`/api/v1/...`)

**Impact**: Breaking changes affect all clients

**Fix Plan**: Add versioning to routes

---

### 16. **No Request ID Tracking**
**Severity**: 🟠 MEDIUM  
**Location**: Request handling

**Issue**: Cannot trace requests across services

**Impact**: Difficult debugging, no audit trail

**Fix Plan**: Add request ID middleware

---

### 17. **Missing .env.example File**
**Severity**: 🟠 MEDIUM  
**Location**: Backend root

**Issue**: No template for environment variables

**Impact**: Developers may miss required variables

**Fix Plan**: Create `.env.example` with all required variables (no values)

---

### 18. **No Dependency Vulnerability Scanning**
**Severity**: 🟠 HIGH  
**Location**: package.json files

**Issue**: No automated security scanning

**Impact**: Vulnerable dependencies

**Fix Plan**:
```bash
npm audit
npm install --save-dev npm-audit-resolver
```

Add to CI/CD pipeline

---

### 19. **No HTTPS Enforcement**
**Severity**: 🟠 HIGH  
**Location**: Server configuration

**Issue**: No HTTPS redirect or enforcement

**Impact**: Man-in-the-middle attacks, data interception

**Fix Plan**: Use reverse proxy (nginx) with SSL, or add HTTPS middleware

---

### 20. **Missing Content Security Policy**
**Severity**: 🟠 HIGH  
**Location**: Frontend and backend

**Issue**: No CSP headers (partially in nginx, but not comprehensive)

**Impact**: XSS attacks

**Fix Plan**: Comprehensive CSP in helmet configuration

---

## 🟡 MEDIUM PRIORITY ISSUES

### 21. **Excessive Console Logging**
**Severity**: 🟡 MEDIUM  
**Location**: Multiple files (156 instances)

**Issue**: Too many console.log statements

**Impact**: Performance impact, log noise

**Fix Plan**: Use proper logging library (winston, pino)

---

### 22. **No Input Validation for Role Assignment**
**Severity**: 🟡 MEDIUM  
**Location**: `backend/routes/auth.js:22`

**Issue**: Role validation exists but anyone can register as 'superadmin'

**Impact**: Unauthorized admin access

**Fix Plan**: Restrict role assignment in registration:
```javascript
// Only allow 'patient' and 'hospital' roles in registration
body('role').isIn(['patient', 'hospital']).withMessage('Invalid role'),
// Superadmin must be created manually
```

---

### 23. **No Password Strength Requirements**
**Severity**: 🟡 MEDIUM  
**Location**: `backend/routes/auth.js:21`

**Issue**: Only 6 character minimum

**Impact**: Weak passwords

**Fix Plan**: Add password strength validation:
```javascript
body('password')
  .isLength({ min: 8 })
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number')
```

---

### 24. **No Account Lockout**
**Severity**: 🟡 MEDIUM  
**Location**: Login endpoint

**Issue**: Unlimited login attempts

**Impact**: Brute force attacks (partially mitigated by rate limiting)

**Fix Plan**: Add account lockout after N failed attempts

---

### 25. **No Session Management**
**Severity**: 🟡 MEDIUM  
**Location**: Authentication system

**Issue**: No way to invalidate tokens or manage sessions

**Impact**: Cannot revoke access, no logout from all devices

**Fix Plan**: Add token blacklist or use Redis for session management

---

### 26. **Missing Health Check Security**
**Severity**: 🟡 MEDIUM  
**Location**: `backend/server.js:54`

**Issue**: Health check exposes system info

**Impact**: Information disclosure

**Fix Plan**: Limit health check information

---

### 27. **No Request Timeout**
**Severity**: 🟡 MEDIUM  
**Location**: Server configuration

**Issue**: Long-running requests can hang

**Impact**: Resource exhaustion

**Fix Plan**: Add request timeout middleware

---

### 28. **Missing Database Connection Pooling Limits**
**Severity**: 🟡 MEDIUM  
**Location**: `backend/config/db.js`

**Issue**: No explicit pool configuration

**Impact**: Connection exhaustion

**Fix Plan**:
```javascript
export const pool = new Pool({
  // ... existing config
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})
```

---

### 29. **No API Documentation**
**Severity**: 🟡 MEDIUM  
**Location**: API routes

**Issue**: No Swagger/OpenAPI documentation

**Impact**: Difficult integration, unclear API contracts

**Fix Plan**: Add Swagger/OpenAPI documentation

---

### 30. **Missing Error Boundaries in Frontend**
**Severity**: 🟡 MEDIUM  
**Location**: React components

**Issue**: ErrorBoundary exists but may not cover all cases

**Impact**: Poor error handling UX

**Fix Plan**: Ensure all routes have error boundaries

---

### 31. **No Input Sanitization Applied**
**Severity**: 🟡 MEDIUM  
**Location**: Frontend forms

**Issue**: `sanitize.ts` utility created but not used

**Impact**: XSS vulnerabilities in user inputs

**Fix Plan**: Apply sanitization to all user inputs before API calls

---

### 32. **Missing HTTPS in Development**
**Severity**: 🟡 LOW  
**Location**: Development setup

**Issue**: HTTP only in development

**Impact**: Different behavior in dev vs production

**Fix Plan**: Use HTTPS in development (optional)

---

### 33. **No Database Migration System**
**Severity**: 🟡 MEDIUM  
**Location**: Database setup

**Issue**: Schema changes require manual SQL

**Impact**: Difficult to manage schema changes

**Fix Plan**: Add migration system (e.g., node-pg-migrate)

---

### 34. **Missing Audit Logging**
**Severity**: 🟡 MEDIUM  
**Location**: All routes

**Issue**: No audit trail for sensitive operations

**Impact**: Cannot track who did what

**Fix Plan**: Add audit logging middleware

---

### 35. **No Backup Strategy**
**Severity**: 🟡 MEDIUM  
**Location**: Database

**Issue**: No backup configuration

**Impact**: Data loss risk

**Fix Plan**: Implement automated backups

---

## 🐛 BUGS FOUND

### Bug 1: Missing Error Handling
**Location**: `backend/routes/dashboard.js:33`
**Issue**: Error caught but not logged properly
**Fix**: Already has console.error, but ensure proper error handling

### Bug 2: Potential Race Condition
**Location**: Registration endpoint
**Issue**: Check-then-insert pattern may have race condition
**Fix**: Use database constraints (UNIQUE) as primary protection

### Bug 3: Missing Validation
**Location**: Various endpoints
**Issue**: Some endpoints don't validate all inputs
**Fix**: Ensure all endpoints use express-validator

---

## 📋 FIX PRIORITY PLAN

### Phase 1: IMMEDIATE (Before any deployment)
1. ✅ Remove all hardcoded secrets
2. ✅ Fix CORS configuration
3. ✅ Add rate limiting
4. ✅ Sanitize logs
5. ✅ Add helmet security headers
6. ✅ Add environment variable validation
7. ✅ Add input sanitization on backend

**Estimated Time**: 4-6 hours

### Phase 2: HIGH PRIORITY (Before production)
1. ✅ Add request size limits
2. ✅ Implement refresh tokens
3. ✅ Add CSRF protection
4. ✅ Add file upload validation
5. ✅ Fix error handling
6. ✅ Add dependency scanning
7. ✅ Enforce HTTPS

**Estimated Time**: 8-12 hours

### Phase 3: MEDIUM PRIORITY (Production hardening)
1. ✅ Implement proper logging
2. ✅ Add API versioning
3. ✅ Add request tracking
4. ✅ Improve password requirements
5. ✅ Add account lockout
6. ✅ Add session management
7. ✅ Add audit logging

**Estimated Time**: 16-24 hours

---

## 🔧 IMPLEMENTATION CHECKLIST

### Security Hardening
- [ ] Remove all hardcoded secrets
- [ ] Configure CORS properly
- [ ] Add rate limiting
- [ ] Add helmet middleware
- [ ] Sanitize all logs
- [ ] Add environment variable validation
- [ ] Implement CSRF protection
- [ ] Add input sanitization
- [ ] Enforce HTTPS
- [ ] Add security headers

### Authentication Improvements
- [ ] Implement refresh tokens
- [ ] Add account lockout
- [ ] Improve password requirements
- [ ] Add session management
- [ ] Add token blacklist

### Code Quality
- [ ] Replace console.log with proper logger
- [ ] Add API documentation
- [ ] Add request ID tracking
- [ ] Improve error handling
- [ ] Add comprehensive tests

### Infrastructure
- [ ] Add dependency scanning to CI/CD
- [ ] Set up automated backups
- [ ] Add monitoring and alerting
- [ ] Configure logging aggregation
- [ ] Set up database migrations

---

## 📊 Risk Assessment Summary

| Category | Critical | High | Medium | Total |
|----------|----------|------|--------|-------|
| Security | 8 | 12 | 15 | 35 |
| Bugs | 0 | 0 | 3 | 3 |
| **Total** | **8** | **12** | **18** | **38** |

**Overall Risk Level**: 🔴 **CRITICAL**

**Recommendation**: **DO NOT DEPLOY TO PRODUCTION** until Phase 1 and Phase 2 fixes are completed.

---

## 📝 Notes

- All fixes should be tested in development environment first
- Security fixes should be reviewed by security team
- Consider security audit before production deployment
- Regular security reviews recommended (quarterly)
- Keep dependencies updated
- Monitor security advisories

---

## 🔗 References

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Node.js Security Best Practices: https://nodejs.org/en/docs/guides/security/
- Express Security Best Practices: https://expressjs.com/en/advanced/best-practice-security.html

---

**Report Generated**: 2024  
**Next Review**: After Phase 1 fixes completed

