# Nginx Multi-Domain Setup for Owner-Based Access Control

## Overview

This guide explains how to configure nginx to serve multiple domains (main app + owner portals) from a single backend server while preserving domain information for owner detection.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Internet Requests                     │
├──────────────────────────────────────────────────────────┤
│  https://fuelfinder.duckdns.org      (Main App)         │
│  https://ifuel-dangay.duckdns.org    (Owner Portal)     │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│                  Nginx Reverse Proxy                     │
│  • Handles SSL termination                               │
│  • Preserves Host header                                 │
│  • Proxies to single backend                             │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│           Express Backend (localhost:3001)               │
│  • detectOwner() middleware                              │
│  • Reads req.hostname                                    │
│  • Filters data by owner                                 │
└──────────────────────────────────────────────────────────┘
```

---

## SSL Certificate Setup

### Option 1: Single Certificate for Multiple Domains (Recommended)

Get one certificate that covers all domains:

```bash
sudo certbot certonly --nginx \
  -d fuelfinder.duckdns.org \
  -d ifuel-dangay.duckdns.org \
  --expand \
  --agree-tos \
  --email your-email@example.com
```

**Advantages:**
- ✅ Easier to manage (one certificate)
- ✅ Single renewal process
- ✅ Shared certificate path

**Location:** `/etc/letsencrypt/live/fuelfinder.duckdns.org/`

### Option 2: Separate Certificates per Domain

Get individual certificates:

```bash
# Main domain
sudo certbot certonly --nginx \
  -d fuelfinder.duckdns.org \
  --agree-tos \
  --email your-email@example.com

# Owner domain
sudo certbot certonly --nginx \
  -d ifuel-dangay.duckdns.org \
  --agree-tos \
  --email your-email@example.com
```

**Advantages:**
- ✅ Independent certificate management
- ✅ Different renewal schedules

---

## Nginx Configuration

### Complete Configuration File

**Location:** `/etc/nginx/sites-available/fuel-finder`

```nginx
# ============================================
# HTTP to HTTPS Redirect
# Redirect all HTTP traffic to HTTPS
# ============================================
server {
    listen 80;
    server_name fuelfinder.duckdns.org ifuel-dangay.duckdns.org;
    
    # Redirect to HTTPS with preserved path
    return 301 https://$host$request_uri;
}

# ============================================
# Main Application Domain
# Shows all stations for public users
# ============================================
server {
    listen 443 ssl http2;
    server_name fuelfinder.duckdns.org;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/fuelfinder.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fuelfinder.duckdns.org/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy to Backend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # CRITICAL: Preserve original domain for owner detection
        proxy_set_header Host $host;
        
        # Client information
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Disable caching for dynamic content
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Serve static uploads directly (optional optimization)
    location /uploads/ {
        alias /home/ubuntu/fuel_finder/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# ============================================
# Owner Portal Domain
# Shows only owner's stations with management interface
# ============================================
server {
    listen 443 ssl http2;
    server_name ifuel-dangay.duckdns.org;
    
    # SSL Configuration (can use same cert if multi-domain)
    ssl_certificate /etc/letsencrypt/live/fuelfinder.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fuelfinder.duckdns.org/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy to Same Backend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # CRITICAL: Preserve original domain for owner detection
        proxy_set_header Host $host;
        
        # Client information
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Disable caching
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

---

## Installation Steps

### Step 1: Backup Existing Configuration

```bash
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
```

### Step 2: Edit Configuration

```bash
sudo nano /etc/nginx/sites-available/fuel-finder
```

Paste the complete configuration from above.

### Step 3: Create Symbolic Link (if needed)

```bash
sudo ln -s /etc/nginx/sites-available/fuel-finder /etc/nginx/sites-enabled/
```

### Step 4: Test Configuration

```bash
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 5: Restart Nginx

```bash
sudo systemctl restart nginx
```

### Step 6: Verify Status

```bash
sudo systemctl status nginx
```

---

## DNS Configuration (DuckDNS)

Ensure both domains point to your EC2 server:

```
fuelfinder.duckdns.org      → <your-ec2-public-ip>
ifuel-dangay.duckdns.org    → <your-ec2-public-ip>
```

**Update via DuckDNS:**
```bash
# Main domain
curl "https://www.duckdns.org/update?domains=fuelfinder&token=YOUR_DUCK_TOKEN&ip="

# Owner domain
curl "https://www.duckdns.org/update?domains=ifuel-dangay&token=YOUR_DUCK_TOKEN&ip="
```

---

## Testing the Setup

### Test 1: SSL Certificate

```bash
# Main domain
echo | openssl s_client -servername fuelfinder.duckdns.org -connect fuelfinder.duckdns.org:443 2>/dev/null | openssl x509 -noout -subject

# Owner domain
echo | openssl s_client -servername ifuel-dangay.duckdns.org -connect ifuel-dangay.duckdns.org:443 2>/dev/null | openssl x509 -noout -subject
```

### Test 2: HTTP to HTTPS Redirect

```bash
curl -I http://fuelfinder.duckdns.org
# Should return: 301 Moved Permanently
# Location: https://fuelfinder.duckdns.org/
```

### Test 3: Domain Preservation

```bash
# Main domain - should return all stations
curl https://fuelfinder.duckdns.org/api/stations

# Owner domain - should return owner info
curl https://ifuel-dangay.duckdns.org/api/owner/info
```

### Test 4: No Redirect Between Domains

```bash
curl -I https://ifuel-dangay.duckdns.org
# Should return: 200 OK (NOT 301 redirect to fuelfinder!)
```

---

## Common Issues and Solutions

### Issue 1: Certificate Mismatch

**Symptom:** Browser shows "NET::ERR_CERT_COMMON_NAME_INVALID"

**Solution:**
```bash
# Get multi-domain certificate
sudo certbot certonly --nginx \
  -d fuelfinder.duckdns.org \
  -d ifuel-dangay.duckdns.org \
  --expand
```

### Issue 2: Owner Domain Redirects to Main Domain

**Symptom:** `ifuel-dangay.duckdns.org` redirects to `fuelfinder.duckdns.org`

**Solution:** Remove any `return 301` directives for the owner domain:

```nginx
# WRONG ❌
server {
    server_name ifuel-dangay.duckdns.org;
    return 301 https://fuelfinder.duckdns.org$request_uri;  # Remove this!
}

# CORRECT ✅
server {
    server_name ifuel-dangay.duckdns.org;
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;  # Keep this!
    }
}
```

### Issue 3: Backend Doesn't Detect Owner

**Symptom:** All domains show same data (all stations)

**Solution:** Ensure `Host` header is preserved:

```nginx
proxy_set_header Host $host;  # NOT $server_name!
```

### Issue 4: 502 Bad Gateway

**Symptom:** Nginx returns 502 error

**Check:**
```bash
# Is backend running?
sudo netstat -tlnp | grep :3001

# Backend logs
pm2 logs fuel-finder

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Certificate Renewal

Certbot auto-renews certificates. Verify:

```bash
# Test renewal
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

---

## Adding More Owner Domains

To add another owner portal (e.g., `shell-roxas.duckdns.org`):

### Step 1: Get SSL Certificate
```bash
sudo certbot certonly --nginx \
  -d shell-roxas.duckdns.org \
  --expand
```

### Step 2: Add nginx Server Block
```nginx
server {
    listen 443 ssl http2;
    server_name shell-roxas.duckdns.org;
    
    ssl_certificate /etc/letsencrypt/live/fuelfinder.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fuelfinder.duckdns.org/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        # ... other headers
    }
}
```

### Step 3: Create Owner in Database
```sql
INSERT INTO owners (name, domain, api_key)
VALUES (
    'Shell Roxas Station',
    'shell-roxas',
    encode(gen_random_bytes(32), 'base64')
);
```

### Step 4: Test and Restart
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## Security Best Practices

### 1. Enable Firewall
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Disable Server Tokens
Add to `http` block in `/etc/nginx/nginx.conf`:
```nginx
http {
    server_tokens off;
}
```

### 3. Rate Limiting
Add to `http` block:
```nginx
http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    
    # Then in server block:
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://localhost:3001;
    }
}
```

### 4. SSL Configuration
Current configuration uses Let's Encrypt defaults. For enhanced security:
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
```

---

## Monitoring and Logs

### Nginx Access Logs
```bash
sudo tail -f /var/log/nginx/access.log
```

### Nginx Error Logs
```bash
sudo tail -f /var/log/nginx/error.log
```

### Filter by Domain
```bash
# Main domain requests only
sudo tail -f /var/log/nginx/access.log | grep fuelfinder.duckdns.org

# Owner domain requests only
sudo tail -f /var/log/nginx/access.log | grep ifuel-dangay.duckdns.org
```

---

## Performance Optimization

### Enable Gzip Compression
Add to `http` block:
```nginx
http {
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss;
}
```

### Connection Keepalive
```nginx
keepalive_timeout 65;
keepalive_requests 100;
```

---

## Quick Reference Commands

```bash
# Test config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

# Reload config (no downtime)
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/error.log

# Renew certificates
sudo certbot renew

# List certificates
sudo certbot certificates
```

---

## Files Reference

- **Nginx config:** `/etc/nginx/sites-available/fuel-finder`
- **SSL certificates:** `/etc/letsencrypt/live/fuelfinder.duckdns.org/`
- **Access logs:** `/var/log/nginx/access.log`
- **Error logs:** `/var/log/nginx/error.log`

---

**Last Updated:** October 2025  
**Version:** 1.0  
**Status:** Production Ready ✅
