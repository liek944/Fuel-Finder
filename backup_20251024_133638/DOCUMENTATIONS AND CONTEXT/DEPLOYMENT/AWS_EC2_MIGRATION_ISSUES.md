# AWS EC2 Backend Migration - Potential Issues & Fixes

## Overview
You've migrated from Render.com to AWS EC2 with backend at `https://fuelfinder.duckdns.org`. This document identifies potential problems and required fixes.

---

## ✅ Current Configuration Status

### Frontend (.env.production)
```env
REACT_APP_API_BASE_URL=https://fuelfinder.duckdns.org
```
**Status**: ✅ Correctly configured

### Backend (.env.production)
```env
ALLOWED_ORIGINS=https://fuelfinderths.netlify.app,http://localhost:3000,http://localhost:3001
```
**Status**: ⚠️ **CRITICAL ISSUE** - Missing fuelfinder.duckdns.org

---

## 🚨 Critical Issues to Fix

### 1. **CORS Configuration - BLOCKING ISSUE**
**Problem**: Backend CORS doesn't allow requests from `https://fuelfinder.duckdns.org`

**Impact**: If your frontend is also served from the same domain, API calls will be blocked by CORS

**Fix Required**: Update backend `.env.production`:
```env
ALLOWED_ORIGINS=https://fuelfinderths.netlify.app,https://fuelfinder.duckdns.org,http://localhost:3000,http://localhost:3001
```

**Where to fix**: `/home/keil/fuel_finder/backend/.env.production` line 25, 53, 79

---

### 2. **Trust Proxy Configuration - CRITICAL**
**Problem**: Backend doesn't have `trust proxy` enabled for Express

**Impact**: 
- Rate limiting will fail (all requests appear to come from proxy IP)
- IP-based features won't work correctly
- Security logs will show wrong IPs

**Current Code** (`server.js` line 6-9):
```javascript
const key =
  req.ip ||
  req.headers["x-forwarded-for"] ||
  req.connection.remoteAddress ||
  "unknown";
```

**Fix Required**: Add to `server.js` after line 94 (after `const app = express();`):
```javascript
// Trust proxy - REQUIRED for AWS EC2 behind load balancer/reverse proxy
app.set('trust proxy', true);
```

**Why**: AWS EC2 deployments typically use:
- Nginx/Apache reverse proxy
- AWS Application Load Balancer (ALB)
- CloudFront CDN
Without `trust proxy`, Express won't read `X-Forwarded-For` headers correctly.

---

### 3. **SSL/HTTPS Configuration**
**Problem**: DuckDNS provides domain but not automatic SSL

**Questions to verify**:
- ✅ Do you have SSL certificate installed? (Let's Encrypt, AWS Certificate Manager)
- ✅ Is there a reverse proxy (Nginx/Caddy) handling HTTPS?
- ✅ Is port 443 open in EC2 Security Group?

**If NO SSL configured**:
- Your backend URL should be `http://fuelfinder.duckdns.org` (not https)
- Update frontend `.env.production`:
  ```env
  REACT_APP_API_BASE_URL=http://fuelfinder.duckdns.org
  ```
- **WARNING**: HTTP is insecure for production

**Recommended SSL Setup** (if not done):
```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d fuelfinder.duckdns.org
```

---

### 4. **Port Configuration**
**Problem**: Backend `.env.production` has `PORT=3001`

**Questions**:
- Is your EC2 Security Group allowing inbound traffic on port 3001?
- Are you using a reverse proxy (Nginx/Caddy) to forward port 80/443 → 3001?

**If using reverse proxy** (recommended):
- ✅ Keep `PORT=3001` in backend
- Configure Nginx/Caddy to proxy to `localhost:3001`

**If exposing directly** (not recommended):
- Open port 3001 in EC2 Security Group
- Use `http://fuelfinder.duckdns.org:3001` in frontend
- **WARNING**: Exposes Node.js directly (security risk)

---

### 5. **File Upload Storage**
**Problem**: Render used persistent disks, EC2 uses local filesystem

**Current Setup**: Backend serves images from `backend/uploads/images/`

**Potential Issues**:
- ❌ EC2 instance restart = lost uploads (if not using EBS volume)
- ❌ Auto-scaling = inconsistent storage across instances
- ✅ You're using Supabase Storage (good!)

**Verification Needed**:
```javascript
// Check if Supabase is primary storage
SUPABASE_URL=https://ycmoophkkikrltgroane.supabase.co
SUPABASE_STORAGE_BUCKET=station-images
```

**Recommendation**: Ensure all image uploads go to Supabase, not local filesystem

---

### 6. **Database Connection**
**Problem**: Using Supabase Pooler with SSL

**Current Config**:
```env
DB_HOST=aws-1-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_SSL=true
```

**Potential Issues**:
- ⚠️ Connection pooler might have different latency from EC2 region
- ⚠️ SSL overhead on every query

**Recommendations**:
- Ensure EC2 region is close to Supabase region (ap-southeast-1)
- Monitor connection pool exhaustion
- Consider direct connection if in same region

---

### 7. **Environment Variables Duplication**
**Problem**: `.env.production` has duplicate entries

**Lines with duplicates**:
- `ALLOWED_ORIGINS`: Lines 25, 53, 79
- `DB_HOST`: Lines 5, 56
- `DB_PORT`: Lines 6, 57
- `DB_NAME`: Lines 7, 58
- `DB_USER`: Lines 8, 59
- `DB_PASSWORD`: Lines 9, 60
- `DB_SSL`: Lines 10, 61
- `PORT`: Lines 14, 64
- `NODE_ENV`: Lines 15, 65 (conflicting values: production vs development!)

**Fix**: Clean up `.env.production` to have single values only

---

### 8. **Security Headers**
**Problem**: No security headers configured for production

**Missing Headers**:
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`

**Fix**: Add to `server.js` after middleware setup:
```javascript
// Security headers for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    next();
  });
}
```

---

### 9. **Rate Limiting Issues**
**Problem**: Rate limiting uses in-memory storage

**Current Implementation**: `Map()` in `server.js`

**Issues with EC2**:
- ❌ Doesn't work with multiple instances (load balancer)
- ❌ Resets on server restart
- ❌ No distributed rate limiting

**Recommendation**: Use Redis for production rate limiting
```bash
npm install redis express-rate-limit rate-limit-redis
```

---

### 10. **Health Check Endpoint**
**Problem**: Health check might not verify all dependencies

**Current**: `/api/health` (needs verification)

**Should check**:
- ✅ Database connectivity
- ✅ Supabase Storage availability
- ✅ OSRM service availability

**Recommended Health Check**:
```javascript
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      storage: 'unknown',
      osrm: 'unknown'
    }
  };
  
  try {
    await testConnection();
    health.checks.database = 'ok';
  } catch (e) {
    health.checks.database = 'error';
    health.status = 'degraded';
  }
  
  // Add more checks...
  
  res.status(health.status === 'ok' ? 200 : 503).json(health);
});
```

---

### 11. **OSRM Configuration**
**Current**:
```env
OSRM_BASE_URL=http://52.64.226.94:5000
```

**Issues**:
- ⚠️ Using HTTP (not HTTPS)
- ⚠️ Using IP address (brittle if instance changes)
- ⚠️ Port 5000 must be open in Security Group

**Recommendations**:
- Use DuckDNS subdomain: `http://osrm.fuelfinder.duckdns.org`
- Or keep internal if backend and OSRM are in same VPC
- Add SSL if exposing publicly

---

### 12. **Documentation Updates Needed**
**Files to update**:
- ✅ `DEPLOYMENT_GUIDE.md` - Still references Render.com
- ✅ `ENVIRONMENT_SETUP.md` - No AWS EC2 section
- ✅ `THESIS_CONTEXT.md` - Update deployment architecture

---

## 🔧 Quick Fix Checklist

### Immediate (Blocking Issues):
- [ ] Add `https://fuelfinder.duckdns.org` to `ALLOWED_ORIGINS`
- [ ] Add `app.set('trust proxy', true)` to `server.js`
- [ ] Clean up duplicate env vars in `.env.production`
- [ ] Verify SSL certificate is installed and working
- [ ] Test CORS from frontend to backend

### High Priority:
- [ ] Add security headers for production
- [ ] Verify EC2 Security Group allows necessary ports
- [ ] Test file uploads to Supabase Storage
- [ ] Verify database connection from EC2
- [ ] Test OSRM connectivity

### Medium Priority:
- [ ] Implement proper health check endpoint
- [ ] Consider Redis for distributed rate limiting
- [ ] Update documentation files
- [ ] Set up monitoring/logging (CloudWatch)

### Low Priority:
- [ ] Optimize database connection pooling
- [ ] Consider CDN for static assets
- [ ] Set up automated backups
- [ ] Configure auto-scaling (if needed)

---

## 🧪 Testing Commands

### Test CORS:
```bash
curl -H "Origin: https://fuelfinderths.netlify.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://fuelfinder.duckdns.org/api/stations
```

### Test SSL:
```bash
curl -I https://fuelfinder.duckdns.org/api/health
```

### Test Backend Health:
```bash
curl https://fuelfinder.duckdns.org/api/health
```

### Test Database Connection:
```bash
curl https://fuelfinder.duckdns.org/api/stats
```

---

## 📋 AWS EC2 Specific Considerations

### Security Group Configuration:
```
Inbound Rules:
- SSH (22): Your IP only
- HTTP (80): 0.0.0.0/0 (if using reverse proxy)
- HTTPS (443): 0.0.0.0/0 (if using reverse proxy)
- Custom TCP (3001): 127.0.0.1/32 (if using reverse proxy) OR 0.0.0.0/0 (if direct)
- Custom TCP (5000): Internal VPC only (for OSRM)
```

### Recommended Nginx Configuration:
```nginx
server {
    listen 80;
    server_name fuelfinder.duckdns.org;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name fuelfinder.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/fuelfinder.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fuelfinder.duckdns.org/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🎯 Next Steps

1. **Fix CORS immediately** - This is blocking your frontend
2. **Add trust proxy** - Required for proper IP handling
3. **Clean up .env.production** - Remove duplicates
4. **Verify SSL setup** - Ensure HTTPS works
5. **Test end-to-end** - Frontend → Backend → Database
6. **Update documentation** - Reflect AWS EC2 deployment

---

## 📞 Support Resources

- **DuckDNS**: https://www.duckdns.org/
- **Let's Encrypt**: https://letsencrypt.org/
- **AWS EC2 Security Groups**: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html
- **Express Trust Proxy**: https://expressjs.com/en/guide/behind-proxies.html
