# 🚀 Fuel Finder Deployment Guide

Complete guide for deploying the Fuel Finder application to production.

## 📋 Prerequisites

- GitHub account (for code hosting)
- Domain name (optional, but recommended)
- Credit card for paid services (some services offer free tiers)

## 🏗️ Architecture Overview

```
Internet → [Frontend (Vercel)] → [Backend API (Render)] → [PostgreSQL+PostGIS (Render)]
```

## 🎯 **OPTION 1: Render + Vercel (Recommended)**

### Step 1: Setup Render Account & Database

1. **Sign up at [Render.com](https://render.com)**
2. **Create a Managed PostgreSQL database**
   - Choose region (keep the same region as the backend for private networking)
   - Copy the "Internal Connection" details (host, port, db, user, password)
3. **Enable PostGIS extension** (via SQL console or external client):
   - ```sql
     CREATE EXTENSION IF NOT EXISTS postgis;
     ```
   - If PostGIS isn't available on your plan/region, use a Postgres provider that supports PostGIS.

## 🔧 Environment Variables Configuration

### Backend Environment Variables (Render)

Set these in your Render Web Service:

```env
# Database (Render PostgreSQL - use Internal Connection values)
DB_HOST=your-internal-db-host.render.internal
DB_PORT=5432
DB_NAME=yourdbname
DB_USER=yourdbuser
DB_PASSWORD=yourdbpassword

# API Configuration
PORT=3001
NODE_ENV=production
ADMIN_API_KEY=your-secure-admin-key-here

# Optional: Rate limiting
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=60000
```

### Frontend Environment Variables (Vercel)

**CRITICAL**: Set the backend URL in Vercel environment variables:

```env
# Production API URL (Replace with your actual Render backend URL)
REACT_APP_API_BASE_URL=https://your-backend-name.onrender.com

# Build optimizations
GENERATE_SOURCEMAP=false
```

### 🚨 Common Deployment Issues

#### Issue 1: Hardcoded localhost URLs
**Problem**: Frontend tries to connect to `http://localhost:3001` in production
**Solution**: Environment variables are now configured to handle this automatically

#### Issue 2: CORS Errors
**Problem**: Frontend can't connect to backend due to CORS
**Solution**: Backend should allow your frontend domain in CORS settings

#### Issue 3: API Key Missing
**Problem**: Admin functions don't work
**Solution**: Set `ADMIN_API_KEY` in both frontend and backend environments

### Step 2: Deploy Backend to Render

1. **Create a new Web Service**:
   - Render Dashboard → New → Web Service → Connect GitHub
   - Select this repo → Set Root Directory to `/backend`
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`

2. **Attach a Persistent Disk for uploads** (images are saved to `backend/uploads/...`):
   - Add Disk → Size e.g. 1–5 GB → Mount Path: `/opt/render/project/src/backend/uploads`
   - This ensures uploaded images persist across deploys.

3. **Configure Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3001
   CACHE_TTL_MS=300000
   ALLOWED_ORIGINS=https://your-app-name.vercel.app
   DB_HOST=your-internal-db-host.render.internal
   DB_PORT=5432
   DB_NAME=yourdbname
   DB_USER=yourdbuser
   DB_PASSWORD=yourdbpassword
   ADMIN_API_KEY=your-secure-admin-key-here
   ```
   - Prefer the database's Internal Connection so SSL isn't required. If using External Connection, update code to enable SSL or configure `pg` accordingly.

4. **Initialize database**:
   - Set "Post-deploy Command": `npm run db:init`
   - Or run manually in a Shell: `npm run db:init`

### Step 3: Deploy Frontend to Vercel

1. **Sign up at [Vercel.com](https://vercel.com)**
2. **Import project**:
   - "New Project" → Import from GitHub
   - Select your repo → Select `/frontend` folder

3. **Configure build settings**:
   ```
   Framework Preset: Create React App
   Build Command: npm run build
   Output Directory: build
   Install Command: npm install
   ```

4. **Set Environment Variables**:
   ```
   REACT_APP_API_BASE_URL=https://your-backend-name.onrender.com
   REACT_APP_ENV=production
   ```

### Step 4: Configure CORS

Update your backend's `.env` or Render service environment variables:
```
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
```

---

## 🎯 **OPTION 2: All-Render Deployment**

Deploy both frontend and backend on Render:

### Backend Service
- Same as Option 1, Step 2

### Frontend (Static Site)
1. **Create a Static Site** on Render
2. **Build settings**:
   ```
   Build Command: npm run build
   Publish Directory: build
   ```
3. **Environment variables**:
   ```
   REACT_APP_API_BASE_URL=https://your-backend-service.onrender.com
   ```

---

## 🎯 **OPTION 3: DigitalOcean App Platform**

### Database Setup
1. **Create Managed PostgreSQL Database**
2. **Enable PostGIS**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

### App Deployment
1. **Create App** → Import from GitHub
2. **Configure services**:
   
   **Backend Service:**
   ```yaml
   name: fuel-finder-api
   source_dir: /backend
   run_command: npm start
   environment_slug: node-js
   instance_count: 1
   instance_size_slug: basic-xxs
   ```
   
   **Frontend Service:**
   ```yaml
   name: fuel-finder-frontend  
   source_dir: /frontend
   build_command: npm run build
   run_command: npx serve -s build -l $PORT
   ```

---

## 🌐 **Custom Domain Setup**

### For Vercel (Frontend):
1. Vercel Dashboard → Project → Settings → Domains
2. Add your domain: `yourdomain.com`
3. Configure DNS: Add CNAME record pointing to `cname.vercel-dns.com`

### For Render (Backend):
1. Render Dashboard → Service → Settings → Custom Domains  
2. Add custom domain: `api.yourdomain.com`
3. Configure DNS: Add CNAME record pointing to your Render service

---

## 🔒 **Security & SSL**

### Automatic SSL
- **Vercel**: Automatic SSL certificates
- **Render**: Automatic SSL certificates  
- **DigitalOcean**: Automatic Let's Encrypt certificates

### Additional Security Headers
Add to your backend server.js:
```javascript
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');  
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

---

## 📊 **Environment Variables Cheat Sheet**

### Backend (.env)
```bash
# Database (Render Managed PostgreSQL - Internal Connection)
DB_HOST=your-internal-db-host.render.internal
DB_PORT=5432
DB_NAME=yourdbname
DB_USER=yourdbuser
DB_PASSWORD=yourdbpassword

# Server
NODE_ENV=production
PORT=3001
CACHE_TTL_MS=300000

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://yourdomain.vercel.app

# Optional
JWT_SECRET=your-secret-key
```

### Frontend (.env)
```bash
REACT_APP_API_BASE_URL=https://your-api.onrender.com
REACT_APP_ENV=production
GENERATE_SOURCEMAP=false
```

---

## 🚀 **Deployment Commands**

### Local Testing Before Deploy
```bash
# Backend
cd backend
npm run db:check
npm start

# Frontend  
cd frontend
REACT_APP_API_BASE_URL=http://localhost:3001 npm start
```

### Deploy with Git
```bash
# Commit changes
git add .
git commit -m "Deploy to production"
git push origin main

# Vercel and Render auto-deploy on git push
```

---

## 📈 **Monitoring & Maintenance**

### Health Checks
- **Backend**: `GET /api/health`
- **Frontend**: Check if site loads

### Logging
- **Render**: Service → Logs in dashboard
- **Vercel**: Project → Logs in dashboard

### Database Maintenance
Use the database's SQL console or connect with a Postgres client using the provided connection string.
Run periodic maintenance as needed:
```sql
ANALYZE;
VACUUM;
```

---

## 💰 **Cost Notes**

- Render offers free and paid tiers for Web Services; Managed PostgreSQL is a paid service. Check current pricing on Render.
- Vercel has free and paid tiers. Choose based on expected traffic and features.

---

## 🔧 **Troubleshooting**

### Common Issues:

1. **CORS Errors**:
   ```bash
   # Fix: Add frontend domain to ALLOWED_ORIGINS in backend
   ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
   ```

2. **Database Connection Failed**:
   ```bash
   # Check in Render dashboard: Service → Environment
   # Ensure DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD are set
   # Re-deploy after changes
   ```

3. **PostGIS Extension Missing**:
   ```sql
   -- Connect to production DB and run:
   CREATE EXTENSION IF NOT EXISTS postgis;
   SELECT PostGIS_Version();
   ```

4. **Build Failures**:
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Check package.json scripts
   npm run build
   ```

### Getting Help:
- **Render**: [render.com/docs](https://render.com/docs)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **PostGIS**: [postgis.net/documentation](https://postgis.net/documentation)

---

## 🎉 **Success Checklist**

- [ ] Backend deployed and responding to `/api/health`
- [ ] Database connected with PostGIS extension
- [ ] Sample stations loaded in production database
- [ ] Frontend deployed and loading
- [ ] API calls working between frontend and backend  
- [ ] CORS configured correctly
- [ ] Custom domains working (optional)
- [ ] SSL certificates active
- [ ] Map displays with station markers
- [ ] Location-based search working

---

## 📞 **Production URLs Example**

```
Frontend: https://fuel-finder.vercel.app
Backend:  https://fuel-finder-api.onrender.com  
Health:   https://fuel-finder-api.onrender.com/api/health
Stations: https://fuel-finder-api.onrender.com/api/stations
```

Your Fuel Finder app is now live and ready for users! 🚀