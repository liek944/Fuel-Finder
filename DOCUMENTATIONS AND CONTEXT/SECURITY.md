# Security Guidelines - Fuel Finder

**Last Updated:** 2025-10-28  
**Scope:** Application-wide security best practices

## 🔒 Overview

This document outlines security measures, policies, and best practices for the Fuel Finder application.

## 🛡️ Transport Security

### HTTPS Enforcement
- **Requirement:** All production traffic MUST use HTTPS
- **Implementation:** Redirect HTTP → HTTPS at CDN/server level
- **Certificate:** Use Let's Encrypt or similar trusted CA

### Configuration
```javascript
// Backend HTTPS enforcement (if not handled by reverse proxy)
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

## 🔐 Content Security Policy (CSP)

### Recommended Headers
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://unpkg.com;
  style-src 'self' 'unsafe-inline' https://unpkg.com;
  img-src 'self' data: blob: https://tile.openstreetmap.org https://*.supabase.co;
  connect-src 'self' https://fuelfinder.duckdns.org https://*.supabase.co;
  font-src 'self';
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
```

### Implementation
**Netlify (_headers file):**
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://unpkg.com; ...
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
```

**Express Backend:**
```javascript
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://fuelfinder.duckdns.org"],
      imgSrc: ["'self'", "data:", "https://tile.openstreetmap.org"],
      // ... other directives
    }
  }
}));
```

## 🌐 CORS Policy

### Current Configuration
```javascript
// backend/app.js
const corsOptions = {
  origin: [
    'https://fuelfinder.netlify.app',
    'https://www.fuelfinder.netlify.app',
    'http://localhost:3000', // Development only
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### Production Rules
- **NEVER** use wildcard (`*`) in production
- Whitelist specific domains only
- Enable `credentials: true` only if needed for cookies/auth
- Log CORS violations for monitoring

## 🔑 API Keys & Secrets Management

### Owner API Keys

**Storage:**
- ✅ Backend: Stored hashed in database (bcrypt)
- ⚠️ Frontend: Stored in `localStorage` (owner portal only)
- ❌ Never in URLs or query parameters

**Security Measures:**
```javascript
// Backend validation
const bcrypt = require('bcrypt');
const isValidApiKey = await bcrypt.compare(providedKey, storedHashedKey);

// Rate limiting per owner
const ownerRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per owner
  keyGenerator: (req) => req.headers['x-api-key']
});
```

**Best Practices:**
- Rotate keys every 90 days
- Use key prefixes for identification (`ifuel-`, `owner-`)
- Log all API key usage for audit trail
- Implement key expiration dates

### Environment Variables
```bash
# .env (NEVER commit to git)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=eyJ...
API_BASE_URL=https://fuelfinder.duckdns.org

# Add to .gitignore
.env
.env.local
.env.production
```

## 🚫 Input Validation & Sanitization

### Server-Side Validation

**Price Reports:**
```javascript
// Validate and sanitize user input
const { fuel_type, price, notes } = req.body;

// Validate fuel_type (whitelist)
const ALLOWED_FUEL_TYPES = ['Regular', 'Premium', 'Diesel'];
if (!ALLOWED_FUEL_TYPES.includes(fuel_type)) {
  return res.status(400).json({ error: 'Invalid fuel type' });
}

// Validate price (numeric, positive, reasonable range)
const numericPrice = parseFloat(price);
if (isNaN(numericPrice) || numericPrice <= 0 || numericPrice > 500) {
  return res.status(400).json({ error: 'Invalid price' });
}

// Sanitize notes (strip HTML, limit length)
const sanitizedNotes = notes ? 
  notes.replace(/<[^>]*>/g, '').substring(0, 500) : '';
```

### Client-Side
- Use React's built-in XSS protection (escapes by default)
- **NEVER** use `dangerouslySetInnerHTML` with user content
- Validate inputs before submission

## 📱 Permission Requests

### Browser Permissions

**Current Implementation (SECURE):**
```javascript
// ✅ Deferred permission request - user-initiated
useEffect(() => {
  arrivalNotifications.setNotificationsEnabled(notificationsEnabled);
  if (notificationsEnabled) {
    // Only request when user enables
    arrivalNotifications.requestNotificationPermission();
  }
}, [notificationsEnabled]);
```

**Anti-Patterns (AVOID):**
```javascript
// ❌ DON'T request on mount
useEffect(() => {
  Notification.requestPermission(); // Annoying & blocked by Safari
}, []);
```

**Best Practices:**
- Request permissions only when needed
- Explain WHY permission is needed
- Handle denials gracefully
- Persist user preference to avoid re-prompting
- Respect platform constraints (Safari, iOS)

## 🛑 Error Handling

### Secure Error Messages

**Backend:**
```javascript
// ❌ BAD - Leaks implementation details
res.status(500).json({ 
  error: error.message, 
  stack: error.stack 
});

// ✅ GOOD - User-friendly, log details server-side
console.error('Database error:', error);
res.status(500).json({ 
  error: 'An error occurred while processing your request' 
});
```

**Frontend:**
```javascript
// ✅ Display generic message, log details
try {
  await fetch(url);
} catch (error) {
  console.error('Fetch failed:', error);
  showToast('Unable to load data. Please try again.', 'error');
}
```

## 🔍 SQL Injection Prevention

### Parameterized Queries
```javascript
// ✅ SAFE - Parameterized query
const result = await pool.query(
  'SELECT * FROM stations WHERE id = $1',
  [stationId]
);

// ❌ UNSAFE - String concatenation
const result = await pool.query(
  `SELECT * FROM stations WHERE id = ${stationId}` // VULNERABLE!
);
```

## 🚨 Threat Model

### Identified Threats

1. **XSS (Cross-Site Scripting)**
   - Risk: Malicious scripts in price notes/reviews
   - Mitigation: Input sanitization, CSP, React escaping

2. **SQL Injection**
   - Risk: Malicious input in database queries
   - Mitigation: Parameterized queries, input validation

3. **CSRF (Cross-Site Request Forgery)**
   - Risk: Unauthorized actions via forged requests
   - Mitigation: SameSite cookies, CORS policy

4. **API Key Exposure**
   - Risk: Keys leaked in logs, URLs, or client code
   - Mitigation: Server-side validation, hashing, rate limiting

5. **DDoS/Resource Exhaustion**
   - Risk: Service disruption via excessive requests
   - Mitigation: Rate limiting, CDN, request throttling

## 📊 Abuse Prevention

### Rate Limiting

**Global Rate Limit:**
```javascript
const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

app.use('/api/', generalLimiter);
```

**Endpoint-Specific:**
```javascript
// Price reporting - stricter limit
const priceReportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 reports per minute
  skipSuccessfulRequests: false
});

app.post('/api/stations/:id/report-price', priceReportLimiter, handler);
```

### Request Deduplication
```javascript
// Prevent duplicate submissions (backend/middleware/deduplication.js)
const recentSubmissions = new Map();

function deduplicationMiddleware(req, res, next) {
  const key = `${req.ip}-${req.body.fuel_type}-${req.body.price}`;
  const now = Date.now();
  const lastSubmission = recentSubmissions.get(key);
  
  if (lastSubmission && (now - lastSubmission) < 5000) {
    return res.status(429).json({ error: 'Duplicate submission detected' });
  }
  
  recentSubmissions.set(key, now);
  next();
}
```

## 📝 Audit Logging

### Activity Tracking
```sql
-- Activity logs table
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES owners(id),
  action TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example log entry
INSERT INTO activity_logs (owner_id, action, ip_address, user_agent)
VALUES (1, 'price_report_verified', '203.0.113.1', 'Mozilla/5.0...');
```

### What to Log
- ✅ Authentication attempts (success/failure)
- ✅ Price report submissions/verifications
- ✅ API key usage
- ✅ Admin actions
- ❌ Personal data (PII)
- ❌ Full request bodies (may contain sensitive data)

## 🔄 Regular Security Tasks

### Weekly
- Review error logs for suspicious patterns
- Check rate limit violations
- Monitor API key usage

### Monthly
- Review and rotate API keys if needed
- Audit user permissions
- Update dependencies (`npm audit fix`)

### Quarterly
- Full security audit
- Review and update CSP
- Penetration testing (if applicable)

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/)

## 🆘 Security Incident Response

If you discover a security vulnerability:
1. **DO NOT** disclose publicly
2. Document the issue with steps to reproduce
3. Contact the development team immediately
4. Follow responsible disclosure guidelines

---

**Remember:** Security is an ongoing process, not a one-time task. Stay vigilant and keep systems updated.
