# AWS EC2 Deployment Checklist

## ✅ Changes Made

### 1. Backend Configuration Fixed
- ✅ Added `https://fuelfinder.duckdns.org` to CORS `ALLOWED_ORIGINS`
- ✅ Added `app.set('trust proxy', true)` to `server.js` for proper IP handling
- ✅ Added security headers for production (HSTS, X-Frame-Options, etc.)
- ✅ Cleaned up duplicate environment variables in `.env.production`

### 2. Files Modified
- `/home/keil/fuel_finder/backend/.env.production` - CORS and duplicate cleanup
- `/home/keil/fuel_finder/backend/server.js` - Trust proxy and security headers

---

## 🚀 Deployment Steps

### Step 1: Verify EC2 Security Group
Ensure these ports are open:
```
Inbound Rules:
- SSH (22): Your IP only
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
- Custom TCP (3001): 127.0.0.1/32 (if using reverse proxy) OR 0.0.0.0/0 (direct)
```

### Step 2: Install SSL Certificate (If Not Done)
```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d fuelfinder.duckdns.org

# Auto-renewal
sudo certbot renew --dry-run
```

### Step 3: Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/fuelfinder`:
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

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/fuelfinder /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Deploy Backend Code
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd /path/to/fuel_finder/backend

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Copy production env
cp .env.production .env

# Update .env with actual values:
# - ADMIN_API_KEY (set your actual key)
# - JWT_SECRET (generate: openssl rand -base64 32)

# Test the server
npm start
```

### Step 5: Setup PM2 for Process Management
```bash
# Install PM2
sudo npm install -g pm2

# Start backend
cd /path/to/fuel_finder/backend
pm2 start server.js --name fuel-finder-api

# Save PM2 config
pm2 save

# Setup auto-start on reboot
pm2 startup
# Follow the command it outputs

# Monitor
pm2 monit
pm2 logs fuel-finder-api
```

### Step 6: Test Deployment
```bash
# Test health endpoint
curl https://fuelfinder.duckdns.org/api/health

# Test CORS
curl -H "Origin: https://fuelfinderths.netlify.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://fuelfinder.duckdns.org/api/stations

# Test database
curl https://fuelfinder.duckdns.org/api/stats

# Test stations endpoint
curl https://fuelfinder.duckdns.org/api/stations
```

---

## 🔍 Verification Checklist

### Backend Health
- [ ] `https://fuelfinder.duckdns.org/api/health` returns 200 OK
- [ ] Database connection working
- [ ] Supabase Storage accessible
- [ ] OSRM service responding

### CORS Configuration
- [ ] Frontend can make API calls
- [ ] No CORS errors in browser console
- [ ] Preflight OPTIONS requests succeed

### SSL/HTTPS
- [ ] Certificate valid and not expired
- [ ] HTTP redirects to HTTPS
- [ ] No mixed content warnings

### Security
- [ ] Security headers present (check with browser DevTools)
- [ ] Rate limiting working
- [ ] Admin API key required for protected endpoints

### Performance
- [ ] Response times acceptable (<500ms for most endpoints)
- [ ] Database queries optimized
- [ ] No memory leaks (monitor with `pm2 monit`)

---

## 🐛 Troubleshooting

### Issue: CORS Errors
**Check:**
```bash
# Verify ALLOWED_ORIGINS in .env
cat /path/to/fuel_finder/backend/.env | grep ALLOWED_ORIGINS

# Should include: https://fuelfinder.duckdns.org
```

**Fix:**
```bash
# Update .env and restart
pm2 restart fuel-finder-api
```

### Issue: 502 Bad Gateway
**Check:**
```bash
# Is backend running?
pm2 status

# Check backend logs
pm2 logs fuel-finder-api

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

**Fix:**
```bash
# Restart backend
pm2 restart fuel-finder-api

# Restart Nginx
sudo systemctl restart nginx
```

### Issue: Database Connection Failed
**Check:**
```bash
# Test database connection
psql "postgresql://postgres.ycmoophkkikrltgroane:c5hCVCx93SB3uzHF@aws-1-ap-southeast-1.pooler.supabase.com:6543/fuel_finder?sslmode=require"

# Check backend logs
pm2 logs fuel-finder-api --lines 100
```

### Issue: Images Not Loading
**Check:**
```bash
# Verify Supabase config
cat /path/to/fuel_finder/backend/.env | grep SUPABASE

# Test image URL
curl https://fuelfinder.duckdns.org/api/images/stations/test.jpg
```

### Issue: Rate Limiting Not Working
**Verify:**
- `app.set('trust proxy', true)` is in server.js
- Nginx is passing X-Forwarded-For headers
- Check logs for IP addresses (should show real client IPs, not proxy IP)

---

## 📊 Monitoring

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs fuel-finder-api

# View metrics
pm2 show fuel-finder-api
```

### Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### Database Monitoring
```bash
# Connect to Supabase dashboard
# Check connection pool usage
# Monitor query performance
```

---

## 🔄 Update Procedure

### Deploying Code Changes
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd /path/to/fuel_finder/backend

# Pull changes
git pull origin main

# Install new dependencies (if any)
npm install

# Restart backend
pm2 restart fuel-finder-api

# Verify
curl https://fuelfinder.duckdns.org/api/health
```

### Database Migrations
```bash
# Run migrations
npm run db:migrate

# Or manually
npm run db:init
```

---

## 🔐 Security Best Practices

### Environment Variables
- ✅ Never commit `.env` files
- ✅ Use strong, random API keys
- ✅ Rotate keys periodically
- ✅ Different keys for dev/staging/prod

### Server Hardening
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Setup firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd
```

### SSL Certificate Renewal
```bash
# Auto-renewal is setup with Certbot
# Test renewal
sudo certbot renew --dry-run

# Check expiry
sudo certbot certificates
```

---

## 📞 Quick Commands Reference

```bash
# Backend Management
pm2 start server.js --name fuel-finder-api
pm2 restart fuel-finder-api
pm2 stop fuel-finder-api
pm2 logs fuel-finder-api
pm2 monit

# Nginx Management
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx
sudo nginx -t

# SSL Certificate
sudo certbot renew
sudo certbot certificates

# Database
npm run db:init
npm run db:check

# Git
git pull origin main
git status
git log --oneline -5
```

---

## ✅ Final Verification

Before going live, verify:
- [ ] SSL certificate installed and working
- [ ] Backend accessible at https://fuelfinder.duckdns.org
- [ ] Frontend can connect to backend
- [ ] Database queries working
- [ ] Image uploads/downloads working
- [ ] OSRM routing working
- [ ] Rate limiting active
- [ ] Security headers present
- [ ] PM2 auto-start configured
- [ ] Nginx auto-start configured
- [ ] Firewall configured
- [ ] Monitoring setup
- [ ] Backup strategy in place

---

## 🎯 Next Steps

1. **Test thoroughly** - Run through all app features
2. **Monitor performance** - Watch logs and metrics
3. **Setup alerts** - Configure PM2 notifications
4. **Document issues** - Keep track of any problems
5. **Plan scaling** - Consider load balancer if traffic grows
