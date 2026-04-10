# Fuel Finder

Find nearby fuel stations, compare prices, and navigate with OpenStreetMap + OSRM. Fuel Finder is a modern, mobile‑first web app and native Android app with community price reporting, a multi‑tenant owner portal, admin analytics,and native-like high fidelity interactions.

![Fuel Finder Logo](frontend/public/logo.jpeg)

---

## ✨ Features

- **Native Android & Web App** built with React, Vite, and Capacitor for seamless cross-platform usage.
- **Station locator** with fast geospatial queries (PostGIS) and Leaflet map UI.
- **A\*-based routing** via OSRM for turn‑by‑turn navigation.
- **Multi fuel types** (Diesel, Premium, Regular) with community price reporting and verification.
- **High-fidelity mobile UI**: Redesigned mobile bottom sheet and station details with interactive map thumbnails, horizontally scrollable fuel price/review cards, hero images, and smart follow camera.
- **Dedicated Owner Portal (multi-tenant)**: Available as a standalone Android app (`owner-app`) and via subdomains, with API‑key authentication.
- **Marketing Landing Page**: Standalone vanilla HTML/CSS/JS custom-styled index page for promotion.
- **Admin analytics** with real-time user heartbeat tracking.

---

## 🧱 Tech Stack

- **Frontend & Mobile**: React + Vite + TypeScript, React‑Leaflet, Chart.js, Capacitor (for Android Native builds).
- **Backend**: Node.js (Express modular architecture), PostgreSQL + PostGIS.
- **Routing**: OSRM server (A\*), configurable via env.
- **Landing Page**: Vanilla HTML/CSS/JS.
- **Storage**: Local uploads or Supabase Storage (optional).
- **Infra**: Works locally and on common hosts (Netlify/Vercel for FE, any Node host for BE).

---

## 📁 Repository Structure

```
.
├── backend/                    # Express API (modular app + routes + controllers + repositories)
├── frontend/                   # Main React + Vite app (Functions as Web App & Capacitor Android App)
├── owner-app/                  # Dedicated Owner Portal React/Capacitor application
├── landing-page/               # Vanilla HTML/CSS/JS Landing UI for product showcase
├── DOCUMENTATIONS AND CONTEXT/ # Deployment guides, feature specs, fixes, etc.
├── scripts/                    # Helper scripts
└── keystore-backup/            # Securely backed up Android keystore files (managed privately)
```

---

## ⚙️ Prerequisites

- Node.js 18+ (20 LTS recommended)
- PostgreSQL 13+ with PostGIS extension
- OSRM server endpoint (local or hosted)
- Java 21+ & Android Studio / Android SDK (If building Android APKs)

---

## 🚀 Quick Start

### 1) Backend (API)

```bash
cd backend
npm install

# configure env (backend/.env)
cp .env.example .env

# initialize database schema + run migrations (requires PostGIS)
npm run db:init

# start API
npm run dev
# API at http://localhost:3001/api
```

### 2) Frontend (Web App & Main App)

```bash
cd frontend
npm install

# configure env
cp .env.example .env

# run dev server
npm run dev
# App at http://localhost:5173
```

### 3) Owner App

```bash
cd owner-app
npm install
npm run dev
```

### 4) Landing Page

Open `landing-page/index.html` in your browser.

---

## 📱 Building Android APKs (Capacitor)

Both the `frontend/` (Main App) and `owner-app/` are equipped with Capacitor to build native Android APKs.

1. Build the production web assets:

```bash
npm run build
```

2. Sync with Android and open Android Studio (or build via command line):

```bash
npx cap sync android
npx cap open android
```

_Note: Make sure your environment is configured for Java 21 compatibility and release keystores are properly and securely configured for Signed releases._

---

## 🔑 Environment Variables

_Be sure to never commit `.env` or other sensitive keystore files into the public repository._

### Backend (.env)

- Server: `PORT`, `NODE_ENV`
- Database: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`
- CORS: `ALLOWED_ORIGINS` (comma‑separated)
- Admin: `ADMIN_API_KEY`
- OSRM: `OSRM_URL`, `OSRM_TIMEOUT_MS`
- Supabase (optional): `SUPABASE_PROJECT_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe (optional): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### Frontend & Owner App (.env)

- `VITE_API_BASE_URL` — required in production, defaults to `http://localhost:3001` in dev.

---

## 🌐 Major Endpoints (Quick Peek)

- `GET /api/stations`, `GET /api/stations/nearby`, `GET /api/stations/:id`
- `POST /api/stations/:id/report-price` — community price report
- `GET /api/pois`, `GET /api/pois/nearby`, `GET /api/pois/:id`
- `GET /api/owner/*` — owner portal APIs (API key required)

---

## 🤝 Contributing

Issues and PRs are welcome.

---

## 📝 License

ISC
