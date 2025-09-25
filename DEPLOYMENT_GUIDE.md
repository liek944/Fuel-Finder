# 🚀 Fuel Finder Deployment Guide

Complete guide for deploying the Fuel Finder application to production.

## 📋 Prerequisites

- GitHub account (for code hosting)
- Domain name (optional, but recommended)
- Credit card for paid services (some services offer free tiers)

## 🏗️ Architecture Overview

```
Internet → [Frontend (Vercel)] → [Backend API (Railway)] → [PostgreSQL+PostGIS (Railway)]
```

## 🎯 **OPTION 1: Railway + Vercel (Recommended)**

### Step 1: Setup Railway Account & Database

1. **Sign up at [Railway.app](https://railway.app)**
2. **Create new project** → "Deploy from GitHub repo"
3. **Add PostgreSQL service**:
   ```
   + New → Database → PostgreSQL
   ```
4. **Enable PostGIS extension**:
   - Go to PostgreSQL service → Connect → Web Editor
   - Run: `CREATE EXTENSION IF NOT EXISTS postgis;`

## 🔧 Environment Variables Configuration

### Backend Environment Variables (Railway)

Set these in your Railway backend service:

```env
# Database (auto-configured by Railway PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:port/dbname

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
# Production API URL (Replace with your actual Railway backend URL)
REACT_APP_API_BASE_URL=https://your-backend-name.up.railway.app

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

### Step 2: Deploy Backend to Railway

1. **Connect GitHub repository**:
   - Push your code to GitHub
   - Railway: "Deploy from GitHub" → Select your repo → Select `/backend` folder

2. **Set Environment Variables** in Railway dashboard:
   ```
   NODE_ENV=production
   PORT=3001
   CACHE_TTL_MS=300000
   ALLOWED_ORIGINS=https://your-app-name.vercel.app
   ```

3. **Database connection** (Railway auto-provides):
   - Railway automatically sets PostgreSQL connection variables
   - No manual DB configuration needed

4. **Initialize database**:
   - Railway CLI: `railway run npm run db:init`
   - Or connect via web editor and run your schema.sql

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
   REACT_APP_API_URL=https://your-backend-name.railway.app
   REACT_APP_ENV=production
   ```

5. **Update Frontend API calls**:
   - Change `http://localhost:3001` to `https://your-backend.railway.app`
   - Update in your React app's API calls

### Step 4: Configure CORS

Update your backend's `.env` or Railway environment variables:
```
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
```

---

## 🎯 **OPTION 2: All-Railway Deployment**

Deploy both frontend and backend on Railway:

### Backend Service
- Same as Option 1, Step 2

### Frontend Service  
1. **Create new Railway service** for frontend
2. **Set build command**:
   ```
   npm run build && npx serve -s build -l $PORT
   ```
3. **Environment variables**:
   ```
   REACT_APP_API_URL=https://your-backend-service.railway.app
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

### For Railway (Backend):
1. Railway Dashboard → Service → Settings → Networking  
2. Add custom domain: `api.yourdomain.com`
3. Configure DNS: Add CNAME record pointing to your Railway service

---

## 🔒 **Security & SSL**

### Automatic SSL
- **Vercel**: Automatic SSL certificates
- **Railway**: Automatic SSL certificates  
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
# Database (Auto-provided by Railway)
DATABASE_URL=postgresql://user:pass@host:port/db
DB_HOST=host
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres  
DB_PASSWORD=secret

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
REACT_APP_API_URL=https://your-api.railway.app
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
REACT_APP_API_URL=http://localhost:3001 npm start
```

### Deploy with Git
```bash
# Commit changes
git add .
git commit -m "Deploy to production"
git push origin main

# Both Vercel and Railway auto-deploy on git push
```

---

## 📈 **Monitoring & Maintenance**

### Health Checks
- **Backend**: `GET /api/health`
- **Frontend**: Check if site loads

### Logging
```bash
# Railway logs
railway logs --service backend

# Vercel logs  
vercel logs
```

### Database Maintenance
```bash
# Connect to production database
railway connect postgres

# Run maintenance
ANALYZE;
VACUUM;
```

---

## 💰 **Cost Estimates**

### Free Tier Options:
- **Railway**: $5/month (includes PostgreSQL + PostGIS)
- **Vercel**: Free for personal projects
- **Total**: ~$5/month

### Paid Tier (Recommended for production):
- **Railway Pro**: $20/month (better resources + support)
- **Vercel Pro**: $20/month (custom domains + analytics)  
- **Total**: ~$40/month

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
   # Check: Environment variables are set correctly
   railway variables list
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
- **Railway**: [docs.railway.app](https://docs.railway.app)
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
Backend:  https://fuel-finder-api.railway.app  
Health:   https://fuel-finder-api.railway.app/api/health
Stations: https://fuel-finder-api.railway.app/api/stations
```

Your Fuel Finder app is now live and ready for users! 🚀