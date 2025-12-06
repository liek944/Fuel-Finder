# Fuel Finder Codebase Analysis

## Overview

**Fuel Finder** is a full-stack web and mobile application designed to locate fuel stations, compare prices with community (crowdsourced) reporting, and provide navigation.

- **Project Type**: Progressive Web App (PWA) with Mobile capabilities (Capacitor).
- **Tech Stack**:
  - **Frontend**: React 19, TypeScript, Vite, Leaflet (Maps), Capacitor (Mobile container).
  - **Backend**: Node.js, Express (v5), PostgreSQL (with PostGIS extension).
- **Architecture**:
  - **Frontend**: Single Page Application (SPA) with heavy client-side logic for generic mapping and offline synchronization.
  - **Backend**: Modular MVC (Model-View-Controller) pattern with distinct layers for Routes, Controllers, Services, and Repositories.

---

## Code Structure

### Frontend (`/frontend`)

- **Entry**: `src/index.tsx`
- **Core UI**: `src/components/MainApp.tsx` acts as the primary orchestrator, managing the map instance, user location, and bottom sheet interactions.
- **State/Logic**: Heavy use of Custom Hooks (`src/hooks`) for segregating logic like routing (`useRoute`), tracking (`useUserTracking`), and toast notifications (`useToast`).
- **Offline Layer**: `src/utils/offlineStorage.ts` and `src/api/*` implement a "network-first, cache-fallback" strategy.
- **PWA/Mobile**: Capacitor configuration in `capacitor.config.ts` and service worker setup for offline capabilities.

#### Frontend Hooks (`/frontend/src/hooks`)

| Hook                                    | Purpose                                           |
| --------------------------------------- | ------------------------------------------------- |
| `useRoute.ts`                           | Route calculation and navigation state management |
| `useFollowCamera.ts`                    | Camera follow mode for navigation                 |
| `useMapDownloader.ts`                   | Offline map tile downloading                      |
| `useOnlineStatus.ts`                    | Network connectivity detection                    |
| `usePWAInstallPrompt.ts`                | PWA installation prompt handling                  |
| `useIsMobile.ts`                        | Device type detection                             |
| `useToast.ts`                           | Toast notification management                     |
| `useFilters.ts` / `useFilterDerived.ts` | Station/POI filtering logic                       |
| `useMapPanForSheet.ts`                  | Map pan adjustments for bottom sheets             |

#### Frontend API Layer (`/frontend/src/api`)

| Module            | Purpose                       |
| ----------------- | ----------------------------- |
| `stationsApi.ts`  | Fuel station CRUD operations  |
| `poisApi.ts`      | Points of Interest operations |
| `routingApi.ts`   | OSRM routing integration      |
| `ownerApi.ts`     | Owner portal API calls        |
| `adminApi.ts`     | Admin dashboard API calls     |
| `reviewsApi.ts`   | Station/POI reviews           |
| `userApi.ts`      | User activity tracking        |
| `donationsApi.ts` | Donation tracking             |

### Backend (`/backend`)

- **Entry**: `server_modular_entry.js`
- **Modules**:
  - `controllers/`: Handle HTTP requests/responses and input validation.
  - `services/`: Business logic and external service integration (Supabase, Pricing logic).
  - `repositories/`: Database interaction layer (raw SQL queries via `pg`).
  - `routes/`: Express route definitions splitting the API by domain (stations, POIs, owners).
  - `middleware/`: Request processing, authentication, and rate limiting.

#### Backend Middleware Layer (`/backend/middleware`)

| Middleware            | Purpose                                     |
| --------------------- | ------------------------------------------- |
| `authentication.js`   | API key verification for protected routes   |
| `ownerAuth.js`        | Owner-specific JWT/session authentication   |
| `ownerDetection.js`   | Subdomain-based owner tenant detection      |
| `rateLimiter.js`      | General API rate limiting                   |
| `adminRateLimiter.js` | Stricter rate limits for admin endpoints    |
| `ownerRateLimiter.js` | Owner portal rate limiting                  |
| `deduplication.js`    | Prevents duplicate price report submissions |
| `errorHandler.js`     | Centralized error formatting and logging    |

#### Backend Services Layer (`/backend/services`)

| Service                   | Purpose                                    | Size   |
| ------------------------- | ------------------------------------------ | ------ |
| `stationService.js`       | Station business logic                     | 7.3KB  |
| `poiService.js`           | POI business logic                         | 2.9KB  |
| `priceService.js`         | Price reporting and verification           | 6.9KB  |
| `ownerService.js`         | Owner dashboard operations                 | 11.7KB |
| `imageService.js`         | Image upload, processing, Supabase storage | 16.3KB |
| `paymentService.js`       | Donation/payment processing                | 9.2KB  |
| `anonymizationService.js` | User data privacy/anonymization            | 9.9KB  |
| `userActivityTracker.js`  | Real-time user analytics (in-memory)       | 9.8KB  |
| `supabaseStorage.js`      | Supabase file storage integration          | 4.5KB  |

#### Backend Database Layer (`/backend/database`)

- **Schema**: `schema.sql` (4.8KB) – Core table definitions
- **Migrations**: 15+ migration scripts in `migrations/`
- **Pool Manager**: `db.js` (33KB) – Database connection pooling and query helpers
- **Scripts**: Interactive owner setup, migration runners, data initialization

---

## Critical Findings

### Strengths

1.  **Robust Architecture**: The backend clearly separates concerns (Controller -> Service -> Repository), which helps in maintainability and testing.
2.  **Offline-First Approach**: The frontend explicitly handles offline states with `offlineStorage` (IndexedDB) and queueing mechanisms for actions like price reporting.
3.  **Performance Optimization**:
    - Use of HTML5 Canvas for map markers (`MainApp.tsx`) avoids DOM thrashing with thousands of standard Leaflet markers.
    - `useMemo` and `useCallback` are frequently used in React components to prevent unnecessary re-renders.
    - LRU cache (`lru-cache`) for frequently accessed backend data.
4.  **Type Safety**: TypeScript is used throughout the frontend, reducing runtime errors.
5.  **Modern Stack**: Utilization of up-to-date libraries (React 19, Express 5, PostGIS).
6.  **Multi-Tenant Support**: Owner portal with subdomain-based tenant detection allows multiple station owners to manage their data independently.
7.  **Comprehensive Middleware**: Rate limiting, deduplication, and authentication are well-structured.

### Issues & Technical Debt

1.  **Monolithic Component (`MainApp.tsx`)**: The `MainApp` component is over 1,468 lines long. It mixes responsibilities including:

    - Map rendering and event handling.
    - Geolocation tracking and filtering.
    - UI state management (Sheets, Toasts, Menus).
    - Data fetching orchestration.
    - _Risk_: This makes the component hard to test and prone to regression bugs.

2.  **Hardcoded Configuration**:

    - Default locations (e.g., Oriental Mindoro coordinates) are hardcoded in the source.
    - Magic numbers for timeouts and throttle limits exist directly in components.

3.  **Legacy Artifacts**: Multiple server entry points exist (`server_modular_entry.js`, `server.js`, `server_modular.js`). See `LEGACY_FILES_CLEANUP.md` for cleanup status.

4.  **CORS Security Concern**: In `backend/app.js`, unknown CORS origins are logged but **still allowed**:

    ```javascript
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      callback(null, true); // Still allow for now, but log the warning
    }
    ```

    _Risk_: This should block unknown origins in production.

5.  **Large Database Utility**: `backend/database/db.js` (33KB, 1000+ lines) is a monolithic file that could benefit from being split into smaller modules.

### Complexity Hotspots

| File                                       | Lines  | Issue                                                  |
| ------------------------------------------ | ------ | ------------------------------------------------------ |
| `frontend/src/components/MainApp.tsx`      | 1,468  | High cyclomatic complexity; numerous `useEffect` hooks |
| `frontend/src/utils/offlineStorage.ts`     | 837    | Complex IndexedDB manager with multiple stores         |
| `backend/database/db.js`                   | ~1,000 | Monolithic database utility file                       |
| `backend/controllers/stationController.js` | —      | Validation logic mixed with control flow               |

---

## Test Coverage

### Existing Tests

| Location                             | Test Files                                               |
| ------------------------------------ | -------------------------------------------------------- |
| `backend/tests/repositories/`        | `stationRepository.test.js`                              |
| `backend/tests/integration/`         | `stationsApi.test.js`                                    |
| `backend/tests/services/`            | `priceService.test.js`, `poiService.test.js`             |
| `backend/tests/load/`                | `load-test.yml` (Artillery load testing)                 |
| `frontend/src/`                      | `App.test.tsx`                                           |
| `frontend/src/hooks/__tests__/`      | `useAdminStations.test.tsx`                              |
| `frontend/src/components/__tests__/` | `AdminStationForm.test.tsx`, `AdminStationList.test.tsx` |

### Coverage Gaps

> [!WARNING]
> Critical components lack test coverage:

- **`MainApp.tsx`** (1,468 lines) – No unit tests
- **`offlineStorage.ts`** (837 lines) – No unit tests
- **Backend controllers** – No dedicated test files
- **Backend middleware** – No test files

---

## Dependencies

### Frontend Dependencies

| Package              | Version | Purpose                       |
| -------------------- | ------- | ----------------------------- |
| `react`              | 19.2.1  | UI framework                  |
| `react-dom`          | 19.2.1  | React DOM renderer            |
| `react-router-dom`   | 7.9.1   | Client-side routing           |
| `leaflet`            | 1.9.4   | Map rendering                 |
| `react-leaflet`      | 5.0.0   | React Leaflet bindings        |
| `@turf/turf`         | 7.2.0   | Geospatial calculations       |
| `chart.js`           | 4.4.3   | Data visualization            |
| `@capacitor/core`    | 7.4.4   | Mobile runtime                |
| `@capacitor/android` | 7.4.4   | Android platform              |
| `vite`               | 6.0.5   | Build tool                    |
| `vite-plugin-pwa`    | 1.1.0   | PWA/Service Worker generation |
| `typescript`         | 5.7.3   | Type checking                 |
| `vitest`             | 3.2.4   | Testing framework             |

### Backend Dependencies

| Package                 | Version | Purpose              |
| ----------------------- | ------- | -------------------- |
| `express`               | 5.1.0   | Web framework        |
| `pg`                    | 8.16.3  | PostgreSQL client    |
| `@supabase/supabase-js` | 2.58.0  | Supabase integration |
| `cors`                  | 2.8.5   | CORS middleware      |
| `multer`                | 2.0.2   | File upload handling |
| `sharp`                 | 0.33.5  | Image processing     |
| `lru-cache`             | 11.2.2  | In-memory caching    |
| `uuid`                  | 10.0.0  | UUID generation      |
| `axios`                 | 1.12.2  | HTTP client          |
| `jest`                  | 30.2.0  | Testing framework    |
| `artillery`             | 2.0.20  | Load testing         |

> [!NOTE]
> Dependencies are "cutting edge" (React 19, Express 5). These may not be LTS versions and could introduce stability risks in production.

---

## Configuration

- **Environment**: controlled via `.env` files.
  - Frontend: `VITE_API_BASE_URL`
  - Backend: `DB_HOST`, `DB_PORT`, `OSRM_URL`, `ADMIN_API_KEY`, `ALLOWED_ORIGINS`
- **Database**: PostgreSQL with PostGIS is required. Initialization scripts are in `backend/database/`.
- **Deployment**: Railway (`railway.json`), PM2 (`ecosystem.config.js`)

---

## Multi-Tenant Architecture

The application supports a **multi-tenant owner portal** via subdomain detection:

```
owner1.fuelfinder.com  →  Owner 1's dashboard
owner2.fuelfinder.com  →  Owner 2's dashboard
```

**Implementation**:

- `middleware/ownerDetection.js` – Parses subdomain from request
- `middleware/ownerAuth.js` – Validates owner credentials
- `services/ownerService.js` – Owner-specific business logic
- Frontend: `OwnerLogin` / `OwnerDashboard` components with subdomain detection in `App.tsx`

---

## Legacy Cleanup Status

From `LEGACY_FILES_CLEANUP.md`:

### Safe to Delete Now

| File                                      | Reason                                         |
| ----------------------------------------- | ---------------------------------------------- |
| `frontend/src/components/AdminPortal.tsx` | Replaced by modular `AdminPortalContainer.tsx` |
| `backend/repositories/userRepository.js`  | Deprecated; returns mock data only             |

### Requires Migration First

| File                        | Blocker                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| `backend/server.js`         | Referenced by `ecosystem.config.js` (PM2) and `start:legacy` script |
| `backend/server_modular.js` | Verify no external deployments reference it                         |

---

## Recommendations

### High Priority

1.  **Refactor `MainApp.tsx`**: Break into smaller components:

    - Extract map logic into `MapController.tsx` or `useMapManager` hook
    - Extract location tracking into a dedicated context/hook
    - Extract bottom sheet management into `SheetManager`

2.  **Fix CORS Security**: Change `backend/app.js` to block unknown origins instead of allowing them with a warning.

3.  **Add Tests for Critical Components**: Prioritize `MainApp.tsx`, `offlineStorage.ts`, and backend controllers.

### Medium Priority

4.  **Validation Middleware**: Move request validation from Controllers to dedicated middleware using Zod or Joi schemas.

5.  **Centralize Constants**: Move hardcoded values (timeouts, default lat/lng, marker colors) to `src/constants/` or a configuration object.

6.  **Split `db.js`**: Break the 33KB database utility into smaller, focused modules (pool management, query builders, migrations).

### Low Priority

7.  **Security Audit**: Verify `ADMIN_API_KEY` handling. Ensure it is never exposed to the frontend. Ensure `api_key` in the database is hashed.

8.  **Complete Legacy Cleanup**: Follow the checklist in `LEGACY_FILES_CLEANUP.md` to remove deprecated files and consolidate entry points.

9.  **Dependency Review**: Consider whether React 19 and Express 5 are stable enough for production, or if LTS versions would be safer.
