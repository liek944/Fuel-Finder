# Fuel Finder – Development Roadmap & Tracker

## 1. Context & Tech Stack

**Purpose:** Fuel Finder is an online fuel station locator and navigation app using **OSRM A*-based routing + OpenStreetMap*\*.

**Recommended Stack:**

* **Frontend:** React (or Vue) + Leaflet.js / Mapbox GL JS for maps
* **Backend:** Node.js + Express
* **Database:** PostgreSQL + PostGIS (geospatial queries)
* **Routing:** OSRM API (A\* algorithm, turn-by-turn navigation)
* **Hosting:** Vercel/Netlify for frontend, Railway/Heroku for backend

**Key Technical Decisions:**

* Caching routes for performance
* Handling real-time fuel price data
* Geolocation accuracy
* Mobile responsiveness

---

## 2. Roadmap (Phase-based with AI Prompts)

### ✅ Phase 1 – Core Foundation

* [x] **Map Setup**
  **AI Prompt:**
  "Help me set up Leaflet.js with OpenStreetMap tiles and display the user’s current geolocation.

  1. Initialize a Leaflet map centered on the user’s coordinates using the browser’s Geolocation API.
  2. Add OSM tile layers with attribution.
  3. Place a marker showing the user’s location.
  4. Ensure the map is responsive on desktop and mobile."

* [x] **Station Data Integration**
  **AI Prompt:**
  "Help me implement a PostGIS-backed API that fetches nearby fuel stations and displays them as markers in Leaflet.

  1. **Database Layer (Postgres + PostGIS):** Create a `stations` table with fields: `id`, `name`, `brand`, `fuel_price`, `services`, `geom` (`geometry(Point, 4326)`). Insert sample data with `ST_SetSRID(ST_MakePoint(lon, lat), 4326)`. Use `ST_DWithin` to query stations within a radius.
  2. **Backend Layer (Node.js + Express):** Build `GET /stations?lat={lat}&lng={lng}&radius={r}`. Connect with `pg`, run SQL query returning id, name, brand, price, services, lat/lng. Respond in JSON.
  3. **Frontend Layer (Leaflet.js):** Fetch `/stations`, loop through results, place `L.marker([lat, lng])` with popups showing station details. Add brand-based icons optionally."

* [x] **Basic Routing**
  **AI Prompt:**
  "Help me integrate OSRM A\*-based routing to generate a route between the user’s current location and a selected station.

  1. Use OSRM HTTP API `route` service.
  2. Backend: Create an endpoint `/route?start=lat,lng&end=lat,lng`.
  3. Parse OSRM response, return polyline coordinates.
  4. Frontend: Draw route on Leaflet map using `L.polyline`.
  5. Add total distance and duration to the UI."

---

### ⏳ Phase 2 – Core Features

* [ ] **Station Details Popup**
  **AI Prompt:**
  "Guide me to implement Leaflet popups that display station details. Show: name, brand, fuel price, services (WiFi, car wash, etc.). Use HTML templates inside popups. Optionally style with CSS for better UX."

* [ ] **Search & Filters**
  **AI Prompt:**
  "Help me add a search bar and filter system for stations. Backend: support queries by fuel type, price range, and open/closed status. Frontend: dropdowns and inputs that send query params to `/stations`. Update markers dynamically."

* [ ] **Favorites / Bookmarks**
  **AI Prompt:**
  "Guide me to implement a favorites system. Frontend: add a star button on station popups. Backend: create `/favorites` API tied to user accounts. Store station IDs in a user table. Display bookmarked stations on map with distinct marker color."

* [ ] **Multi-stop Routing**
  **AI Prompt:**
  "Help me extend OSRM routing to support multiple waypoints. Backend: accept an array of coordinates. Call OSRM `route` with `&overview=full&steps=true`. Frontend: draw polyline for full route and add numbered markers for each stop."

---

### ⏳ Phase 3 – Advanced Features

* [ ] **Traffic-aware Routing**
  **AI Prompt:**
  "Integrate real-time traffic data with OSRM. Explore third-party APIs (Google, HERE, TomTom). Backend: fetch traffic data and adjust route costs. Frontend: color-code congested segments on the map."

* [ ] **Eco-friendly Route Suggestion**
  **AI Prompt:**
  "Guide me to add eco-routing. Backend: implement weighting based on distance + elevation + stops. Use OSRM custom profiles if needed. Frontend: display a ‘green route’ option with estimated fuel savings."

* [ ] **Predictive Fuel Alerts**
  **AI Prompt:**
  "Help me create a system that predicts when users will need to refuel. Use distance travelled and average consumption estimates. Backend: alert logic + push notifications. Frontend: show a warning and nearest stations suggestion."

* [ ] **Emergency POIs**
  **AI Prompt:**
  "Guide me to extend the database with emergency POIs (hospitals, mechanics, police). Backend: `/emergency` endpoint with categories. Frontend: toggle layer to display emergency POIs with custom icons."

---

### ⏳ Phase 4 – Admin & Analytics

* [ ] **Admin Dashboard (CRUD for stations)**
  **AI Prompt:**
  "Help me build an admin dashboard with CRUD for station data. Backend: `/admin/stations` routes (create, update, delete). Frontend: React/Vue forms with validation. Use JWT for admin authentication."

* [ ] **Usage Analytics**
  **AI Prompt:**
  "Guide me to track app usage. Backend: log station clicks, routes generated, favorites added. Store in analytics table. Frontend: charts with libraries like Chart.js or Recharts showing usage trends."

* [ ] **ML Price Prediction**
  **AI Prompt:**
  "Help me integrate a machine learning model that predicts fuel prices. Use Python (scikit-learn) or a hosted ML service. Backend: expose `/predict-price` endpoint. Frontend: display predicted price trend in station popup."

* [ ] **Review & Ratings System**
  **AI Prompt:**
  "Guide me to build a review system for stations. Backend: `/reviews` table linked to stations + users. Endpoints to add and fetch reviews. Frontend: star ratings and comment forms inside station popups."

---

### ⏳ Phase 5 – Performance & Deployment

* [ ] **Offline Mode (PWA)**
  **AI Prompt:**
  "Help me turn Fuel Finder into a Progressive Web App. Enable service workers to cache map tiles, routes, and station data. Allow limited offline functionality."

* [ ] **Caching & Background Sync**
  **AI Prompt:**
  "Guide me to implement caching for routes and station data. Use Redis or in-memory cache on backend. Add background sync for fuel prices."

* [ ] **Security Enhancements**
  **AI Prompt:**
  "Help me secure the system. Add rate limiting on APIs (express-rate-limit), sanitize inputs, enable HTTPS, set HTTP security headers, and add audit logging."

* [ ] **Deployment (CI/CD pipeline)**
  **AI Prompt:**
  "Guide me to deploy the app. Use GitHub Actions for CI/CD. Deploy frontend to Vercel/Netlify and backend to Railway/Heroku. Configure environment variables for API keys and DB connection."

---

## 3. Feature Tracker (Checklist)

### User Experience

* [ ] Dark/Light Mode
* [ ] In-app Notifications
* [ ] Email/SMS Alerts

### Technical Improvements

* [ ] API Optimization
* [ ] Database Indexing
* [ ] Caching Strategy

### Admin Tools

* [ ] Station CRUD Management
* [ ] Booking/Transaction Logs
* [ ] Revenue & Usage Reports

### Monitoring & Testing

* [ ] Error Tracking
* [ ] Unit & Integration Tests
* [ ] Automated Backups
