# Fuel Finder

Find nearby fuel stations, compare prices, and navigate with OpenStreetMap + OSRM. Fuel Finder is a modern, mobile‑first web app with community price reporting, a multi‑tenant owner portal, admin analytics, trip recording, and PWA support.

![Fuel Finder Logo](frontend/public/logo.jpeg)

---

## ✨ Features
- **Station locator** with fast geospatial queries (PostGIS) and Leaflet map UI
- **A*-based routing** via OSRM for turn‑by‑turn navigation
- **Multi fuel types** (Diesel, Premium, Regular) with community price reporting and verification
- **Rich station & POI details**: images, address, phone, operating hours
- **Mobile bottom sheet UI** and **smart follow camera** for a native-like feel
- **Owner Portal (multi-tenant)** via subdomains with API‑key authentication
- **Admin analytics** with real-time user heartbeat tracking
- **Trip Recorder & Replay** visualization tools
- **PWA install** for home‑screen usage

---

## 🧱 Tech Stack
- **Frontend**: React + Vite + TypeScript, React‑Leaflet, Chart.js, Vitest
- **Backend**: Node.js (Express modular architecture), PostgreSQL + PostGIS
- **Routing**: OSRM server (A*), configurable via env
- **Storage**: Local uploads or Supabase Storage (optional)
- **Infra**: Works locally and on common hosts (Netlify/Vercel for FE, any Node host for BE)

---

## 📁 Repository Structure
```
.
├── backend/                  # Express API (modular app + routes + controllers + repositories)
│   ├── config/               # environment.js, database.js
│   ├── routes/               # stations, pois, owner, reviews, user, route, health
│   ├── controllers/          # business logic
│   ├── repositories/         # Postgres/PostGIS queries
│   ├── services/             # integrations (e.g., storage)
│   └── database/             # schema.sql, migrations/, init scripts
├── frontend/                 # React + Vite app (Main App, Admin, Owner Portal)
│   ├── public/               # manifest, icons, sw
│   └── src/                  # components, contexts, utils, types
├── DOCUMENTATIONS AND CONTEXT/  # In‑repo docs (deployment, specs, fixes, thesis, etc.)
└── scripts/                  # helper scripts
```

---

## ⚙️ Prerequisites
- Node.js 18+ (20 LTS recommended)
- PostgreSQL 13+ with PostGIS extension
- OSRM server endpoint (local or hosted)

---

## 🚀 Quick Start

### 1) Backend (API)
```bash
# install deps
cd backend
npm install

# configure env (backend/.env)
# minimal example
cat > .env << 'EOF'
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=fuel_finder
DB_SSL=false

# CORS origins for local dev
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Optional: set your keys/services as needed
ADMIN_API_KEY=change-me
OSRM_URL=http://localhost:5000
SUPABASE_PROJECT_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
EOF

# initialize database schema + run migrations (requires PostGIS)
npm run db:init

# start API (modular entry)
npm run dev
# API at http://localhost:3001/api
```

PostGIS note: if the extension isn’t enabled, the API will log how to enable it: `CREATE EXTENSION IF NOT EXISTS postgis;`.

### 2) Frontend (Web App)
```bash
# install deps
cd frontend
npm install

# configure env
cp .env.example .env
# set VITE_API_BASE_URL to your backend, e.g.
# VITE_API_BASE_URL=http://localhost:3001

# run dev server
npm run dev
# App at http://localhost:5173
```

---

## 🔑 Environment Variables

### Backend (.env)
- Server: `PORT`, `NODE_ENV`
- Database: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`
- CORS: `ALLOWED_ORIGINS` (comma‑separated)
- Admin: `ADMIN_API_KEY`
- OSRM: `OSRM_URL`, `OSRM_TIMEOUT_MS`
- Supabase (optional): `SUPABASE_PROJECT_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe (optional): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### Frontend (.env)
- `VITE_API_BASE_URL` — required in production, defaults to `http://localhost:3001` in dev

---

## 🧪 Useful Scripts

### Backend
- `npm run dev` — start API (server_modular_entry.js)
- `npm run db:init` — create schema + run migrations
- `npm run db:check` — inspect DB/PostGIS status
- `npm run db:reset` — drop and re‑init schema
- `npm run db:sample` — insert sample data

### Frontend
- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run test` — unit tests (Vitest)

---

## 🌐 Major Endpoints (Quick Peek)
- `GET /api/stations`, `GET /api/stations/nearby`, `GET /api/stations/:id`
- `POST /api/stations/:id/report-price` — community price report
- `GET /api/pois`, `GET /api/pois/nearby`, `GET /api/pois/:id`
- `GET /api/owner/*` — owner portal APIs (API key required)
- `GET /api/reviews/*`, `GET /api/route/*`, `GET /api/user/*`, `GET /api/health`

For full details, see the in‑repo docs referenced below.

---

## 🧭 Owner Portal (Multi‑Tenant)
- Subdomain‑based routing (e.g., `owner-name.fuelfinder.com`) automatically loads the Owner Portal UI
- All owner requests include `x-api-key` and are scoped to that owner’s stations
- Local development uses the main app by default (no subdomain)

---

## 📦 Deployment Notes
- Frontend: host on Netlify/Vercel. Set `VITE_API_BASE_URL` to your backend URL.
- Backend: run on any Node host (PM2/systemd). Configure `.env` and CORS.
- OSRM: provide a reachable `OSRM_URL` (self‑host or use an external instance).
- Images: use local uploads or configure Supabase Storage keys.

---

## 📚 Documentation Index
- See `DOCUMENTATIONS AND CONTEXT/README.md` for deployment guides, feature specs, fixes, and thesis context.

---

## 🤝 Contributing
Issues and PRs are welcome. Please:
- Match existing code style and conventions
- Keep changes focused and incremental
- Avoid committing secrets (.env, keys)

---

## 🙏 Acknowledgements
- OpenStreetMap contributors
- OSRM Project
- Leaflet & React‑Leaflet

---

## 📝 License
ISC — see package metadata. Replace with your preferred license if needed.
