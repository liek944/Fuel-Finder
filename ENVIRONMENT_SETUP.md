# 🔧 Environment Configuration Guide

This guide explains how to properly configure the Fuel Finder application for different environments (development, staging, production) and hosting platforms.

## 🚨 The Problem

The Fuel Finder app was initially built with hardcoded API URLs like `http://localhost:3001`, which works fine in development but breaks when deployed to production environments like Vercel, Netlify, Railway, etc.

**Before (Hardcoded - ❌ Breaks in Production)**:
```javascript
const res = await fetch("http://localhost:3001/api/stations", {
  method: "POST",
  // ...
});
```

**After (Environment-Aware - ✅ Works Everywhere)**:
```javascript
const res = await apiPost("/api/stations", data, apiKey);
```

## 🏗️ Architecture Overview

```
Development:  Frontend (localhost:3000) → Backend (localhost:3001)
Production:   Frontend (vercel.app)    → Backend (railway.app)
```

## 📁 File Structure

```
fuel_finder/
├── frontend/
│   ├── .env.development      # Development config
│   ├── .env.production       # Production config
│   ├── src/utils/api.ts      # API configuration utilities
│   └── vercel.json           # Vercel deployment config
├── backend/
│   ├── .env                  # Backend environment variables
│   └── server.js
└── ENVIRONMENT_SETUP.md      # This file
```

## ⚙️ Frontend Configuration

### 1. Environment Files

**`.env.development`** (for local development):
```env
# Development environment configuration
REACT_APP_API_BASE_URL=http://localhost:3001

# Optional: Enable development logging
REACT_APP_DEBUG=true
```

**`.env.production`** (template for production):
```env
# Production environment configuration
# Replace with your actual backend URL
REACT_APP_API_BASE_URL=https://your-backend-url.com

# Production optimizations
GENERATE_SOURCEMAP=false
REACT_APP_DEBUG=false
```

### 2. API Utility Functions

The app now uses environment-aware API utilities in `src/utils/api.ts`:

```typescript
// Automatically uses correct URL based on environment
import { apiPost, apiGet, getImageUrl } from '../utils/api';

// Works in both development and production
const response = await apiPost('/api/stations', stationData, apiKey);
const imageUrl = getImageUrl('/api/images/stations/photo.jpg');
```

## 🖥️ Backend Configuration

### Environment Variables (`.env`)

```env
# Database Configuration (adjust for your setup)
DATABASE_URL=postgresql://username:password@localhost:5432/fuel_finder
# OR if using Railway/Render, they auto-inject this

# Server Configuration
PORT=3001
NODE_ENV=development

# Security
ADMIN_API_KEY=your-super-secure-admin-key-here

# CORS (add your frontend URLs)
FRONTEND_URL=http://localhost:3000,https://your-app.vercel.app

# Optional: Rate Limiting
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=60000

# Optional: OSRM Configuration
OSRM_TIMEOUT_MS=15000
```

## 🚀 Deployment Configurations

### Vercel (Frontend)

**Environment Variables in Vercel Dashboard:**
```
REACT_APP_API_BASE_URL = https://your-backend.up.railway.app
GENERATE_SOURCEMAP = false
```

**Or in `vercel.json`:**
```json
{
  "env": {
    "REACT_APP_API_BASE_URL": "https://your-backend.up.railway.app"
  }
}
```

### Railway (Backend)

**Environment Variables in Railway Dashboard:**
```
DATABASE_URL = (auto-injected by Railway PostgreSQL)
PORT = (auto-injected by Railway)
NODE_ENV = production
ADMIN_API_KEY = your-secure-key
FRONTEND_URL = https://your-app.vercel.app
```

### Render (Backend Alternative)

**Environment Variables in Render Dashboard:**
```
DATABASE_URL = (from Render PostgreSQL)
PORT = 10000
NODE_ENV = production
ADMIN_API_KEY = your-secure-key
FRONTEND_URL = https://your-app.vercel.app
```

### Netlify (Frontend Alternative)

**Environment Variables in Netlify Dashboard:**
```
REACT_APP_API_BASE_URL = https://your-backend.onrender.com
```

## 🔄 Common Deployment Scenarios

### Scenario 1: Full Railway Deployment
```
Frontend: Railway Static Site
Backend: Railway Node.js Service
Database: Railway PostgreSQL
```

**Frontend Environment:**
```env
REACT_APP_API_BASE_URL=https://backend-service.up.railway.app
```

### Scenario 2: Vercel + Railway
```
Frontend: Vercel
Backend: Railway Node.js Service
Database: Railway PostgreSQL
```

**Frontend Environment (Vercel):**
```env
REACT_APP_API_BASE_URL=https://fuel-finder-backend.up.railway.app
```

### Scenario 3: Netlify + Render
```
Frontend: Netlify
Backend: Render Web Service
Database: Render PostgreSQL
```

**Frontend Environment (Netlify):**
```env
REACT_APP_API_BASE_URL=https://fuel-finder-backend.onrender.com
```

## 🛠️ Development Setup

### 1. Clone and Install
```bash
git clone <your-repo>
cd fuel_finder

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Setup Environment Files
```bash
# Frontend
cd fuel_finder/frontend
cp .env.development.example .env.development

# Backend
cd ../backend
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Start Development Servers
```bash
# Terminal 1: Backend
cd fuel_finder/backend
npm run dev

# Terminal 2: Frontend
cd fuel_finder/frontend
npm start
```

## 🔍 Troubleshooting

### Issue 1: "Failed to fetch" in Production
**Cause**: Frontend trying to connect to localhost
**Solution**: Set `REACT_APP_API_BASE_URL` to your production backend URL

### Issue 2: CORS Errors
**Cause**: Backend not allowing frontend domain
**Solution**: Update backend CORS configuration:
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-app.vercel.app',
    'https://your-custom-domain.com'
  ]
}));
```

### Issue 3: Images Not Loading
**Cause**: Image URLs still pointing to localhost
**Solution**: Use `getImageUrl()` utility:
```javascript
// Instead of hardcoded URL
src="http://localhost:3001/api/images/stations/photo.jpg"

// Use utility
src={getImageUrl('/api/images/stations/photo.jpg')}
```

### Issue 4: Admin Functions Not Working
**Cause**: API key not set or mismatched
**Solution**: Ensure `ADMIN_API_KEY` is the same in both environments

### Issue 5: Database Connection Failed
**Cause**: Wrong DATABASE_URL or PostGIS not enabled
**Solution**: 
1. Check DATABASE_URL format
2. Enable PostGIS: `CREATE EXTENSION IF NOT EXISTS postgis;`

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Set all environment variables
- [ ] Test API connections locally
- [ ] Verify image uploads work
- [ ] Check database migrations run
- [ ] Confirm PostGIS extension enabled

### Post-Deployment
- [ ] Test frontend can connect to backend
- [ ] Verify map loads correctly
- [ ] Test station creation/deletion
- [ ] Check image upload/display
- [ ] Test admin API key functionality
- [ ] Verify CORS headers are correct

## 🔐 Security Best Practices

1. **Never commit secrets**: Use `.gitignore` for `.env` files
2. **Strong API keys**: Use long, random strings
3. **HTTPS only**: Always use HTTPS in production
4. **Environment isolation**: Different keys for dev/staging/prod
5. **Regular rotation**: Change API keys periodically

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify environment variables are set correctly
3. Test API endpoints directly (Postman/curl)
4. Check backend logs for connection issues
5. Ensure database is accessible and PostGIS is enabled

## 🔄 Quick Reference

### Development URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Admin Portal: http://localhost:3000/admin

### Environment Variable Format
- Frontend: Must start with `REACT_APP_`
- Backend: Standard environment variables
- Hosting: Set in platform dashboard or config files