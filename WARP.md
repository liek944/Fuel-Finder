# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## 🗂️ Project Overview

**Fuel Finder** is a geospatial web application for finding fuel stations in the Philippines. Built as a full-stack TypeScript/JavaScript application with React frontend and Node.js backend, using PostgreSQL with PostGIS for spatial data operations.

**Live App**: https://fuelfinderths.netlify.app  
**Backend**: https://fuelfinder.duckdns.org  
**Admin Portal**: Available at `/admin` path

## 🏗️ Architecture

### Frontend (`/frontend/`)
- **Framework**: React 19 with TypeScript
- **Mapping**: Leaflet + React-Leaflet for interactive maps
- **Routing**: React Router for SPA navigation  
- **PWA**: Progressive Web App with offline support
- **Build**: Create React App (CRA) build system

### Backend (`/backend/`)
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL with PostGIS extension
- **Services**: Modular service architecture in `services/`
  - `imageService.js` - Image upload/processing with Sharp
  - `supabaseStorage.js` - Cloud storage integration
  - `paymentService.js` - PayMongo payment processing
  - `anonymizationService.js` - Data anonymization

### Database Layer
- **Location**: `backend/database/`
- **Main file**: `db.js` - All database operations and queries
- **Spatial queries**: Uses PostGIS functions for geospatial operations
- **Connection pooling**: PostgreSQL connection pool management

## 🚀 Development Commands

### Backend Development
```bash
cd backend

# Start development server
npm run dev

# Database operations
npm run db:init         # Initialize database schema
npm run db:reset        # Reset database with fresh schema
npm run db:check        # Check database connection
npm run db:sample       # Add sample data

# Production
npm start
```

### Frontend Development  
```bash
cd frontend

# Development server (port 3000)
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Testing & Validation
```bash
# Test database connection
cd backend && node test-db-connection.js

# Test image upload functionality  
cd backend && node test-upload-deduplication.js

# Debug upload issues
./debug-upload-issue.sh

# Verify donation system
./verify-donation-stats.sh

# Check PM2 status (production)
./verify-pm2-status.sh
```

## 🎯 Key Features & Components

### Trip Recording System
- **Location**: `frontend/src/utils/`
- **Core files**:
  - `locationRecorder.ts` - GPS tracking and trip recording
  - `tripSessionManager.ts` - Trip data management
  - `tripReplayAnimator.ts` - Animation engine for trip playback
  - `indexedDB.ts` - Local storage for offline capability

### Payment System (PayMongo Integration)
- **Webhook handling**: `/api/webhooks/paymongo` endpoint
- **Database**: Donation tracking with status updates
- **Type casting**: PostgreSQL explicit type casting for webhook data
- **Recent fix**: WEBHOOK_FIX_SUMMARY.md documents type casting fix

### Image Management
- **Upload deduplication**: Request hashing to prevent duplicate uploads
- **Storage**: Supabase integration with local fallback
- **Processing**: Sharp for image resizing and optimization
- **Organization**: Station and POI image associations

### Geospatial Operations
- **PostGIS queries**: Distance calculations, nearby searches
- **Coordinates**: Uses WGS84 (SRID 4326) coordinate system
- **Radius searches**: ST_DWithin for efficient spatial queries

## 📁 Directory Structure

```
├── frontend/src/
│   ├── components/         # React components
│   │   ├── MainApp.tsx     # Main application component
│   │   ├── AdminPortal.tsx # Admin interface
│   │   ├── TripRecorder.tsx
│   │   └── DonationWidget.tsx
│   ├── utils/              # Utility functions and services
│   ├── styles/             # CSS files
│   └── examples/           # Example components
├── backend/
│   ├── server.js           # Express server entry point
│   ├── database/
│   │   ├── db.js          # All database operations
│   │   └── init.js        # Database initialization
│   └── services/          # Business logic services
└── DOCUMENTATIONS AND CONTEXT/  # Project documentation
```

## 🔧 Common Development Tasks

### Adding New API Endpoints
1. Add route handler in `backend/server.js`
2. Implement database operations in `backend/database/db.js`  
3. Update frontend API calls in `frontend/src/utils/api.ts`
4. Test with appropriate test files in `backend/`

### Database Schema Changes
```bash
# Apply migration
cd backend && node database/apply_migration.js

# Check connection after changes
npm run db:check
```

### Image Upload Features
- **Deduplication**: Automatic request deduplication prevents duplicate uploads
- **Rate limiting**: Built-in rate limiting middleware
- **Storage**: Primary: Supabase, Fallback: Local filesystem

### Deployment Scripts
- `deploy-webhook-fix.sh` - Deploy PayMongo webhook fixes
- `deploy-donations.sh` - Deploy donation system updates
- Backend uses PM2 for process management in production

## 🐛 Debugging & Troubleshooting

### Database Issues
```bash
# Check PostGIS extension
cd backend && npm run db:check

# Reset database if corrupted
cd backend && npm run db:reset
```

### Image Upload Problems
```bash
# Debug upload issues
./debug-upload-issue.sh

# Test deduplication
cd backend && node test-upload-deduplication.js
```

### Payment Webhook Issues
- Check `WEBHOOK_FIX_SUMMARY.md` for recent PayMongo type casting fixes
- Verify webhook endpoint: `/api/webhooks/paymongo`
- Monitor logs: `pm2 logs fuel-finder | grep -E "(Webhook|Donation)"`

## 🔐 Environment Configuration

### Backend (.env)
```bash
# Database (PostgreSQL with PostGIS)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fuel_finder
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false

# API Configuration
PORT=3001
ADMIN_API_KEY=your_admin_key
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=60000

# Supabase Storage
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

### Frontend (.env.local)
```bash
REACT_APP_API_BASE_URL=http://localhost:3001
```

## 📊 Performance Considerations

- **Database queries**: Use PostGIS spatial indexes for location queries
- **Image optimization**: Sharp automatically resizes/compresses images
- **Request deduplication**: Prevents duplicate API calls from load balancers
- **Rate limiting**: Per-IP rate limiting to prevent abuse
- **Connection pooling**: PostgreSQL connection pool configured for production

## 🔍 Key Files to Understand

1. **`backend/server.js`** - Main application entry point with middleware configuration
2. **`backend/database/db.js`** - All database operations and PostGIS queries  
3. **`frontend/src/components/MainApp.tsx`** - Main React application component
4. **`frontend/src/utils/locationRecorder.ts`** - GPS tracking functionality
5. **`DOCUMENTATIONS AND CONTEXT/`** - Comprehensive project documentation

## 📚 Documentation References

The `DOCUMENTATIONS AND CONTEXT/` directory contains extensive documentation:
- `DEPLOYMENT_GUIDE.md` - Production deployment instructions
- `PHASE_*` files - Feature implementation documentation  
- `*_INTEGRATION_GUIDE.md` - Integration instructions for various features
- `WEBHOOK_FIX_SUMMARY.md` - Recent PayMongo webhook fixes

When working on this codebase, always check the relevant documentation files for context-specific implementation details and troubleshooting guides.