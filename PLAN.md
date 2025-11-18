# Fuel Finder Code & Architecture Improvement Plan

## 1. Scope & Goals

- **Goal:** Improve code structure, maintainability, and testability without changing existing features or behavior.
- **Backend:** Already modularized (see [MODULARIZATION_PLAN.md](cci:7://file:///home/keil/fuel_finder/DOCUMENTATIONS%20AND%20CONTEXT/MODULARIZATION/MODULARIZATION_PLAN.md:0:0-0:0), [MODULARIZATION_COMPLETE.md](cci:7://file:///home/keil/fuel_finder/DOCUMENTATIONS%20AND%20CONTEXT/MODULARIZATION/MODULARIZATION_COMPLETE.md:0:0-0:0)). Focus now is on services, contracts, tests, and observability.
- **Frontend:** Main targets are `AdminPortal.tsx` and `MainApp.tsx`, plus creating a clean API/types/state layer.

---

## 2. Current State Summary

- **Backend**
  - **Status:** Modularization complete, 51 endpoints working (see [MODULARIZATION_COMPLETE.md](cci:7://file:///home/keil/fuel_finder/DOCUMENTATIONS%20AND%20CONTEXT/MODULARIZATION/MODULARIZATION_COMPLETE.md:0:0-0:0)).
  - **Layers:** `config/`, `middleware/`, `routes/`, `controllers/`, `repositories/`, `services/`, `utils/`.
  - **Next:** Better API docs, service layer consistency, tests, logging/monitoring.

- **Frontend**
  - **Status:** Partially modularized.
  - **Known huge files:** `AdminPortal.tsx`, `MainApp.tsx`.
  - **Some modular pieces exist:** `admin/`, `hooks/`, `constants/`, `types/`, etc., but not consistently used.

---

## 3. Phase 1 – Frontend API & Types Consolidation (Small, High Impact)

**Objective:** Centralize all backend calls and TypeScript types to avoid duplication and keep frontend ↔ backend contracts in sync.

### 3.1 API Clients (`src/api/` or `src/services/`)

- [x] **Create API base helper**
  - **Task:** Create `src/api/httpClient.ts` (or similar) that wraps `fetch`/`axios`:
    - Base URL from `VITE_API_BASE_URL`.
    - Common headers, error handling, and JSON parsing.
  - **Impact:** All components use the same error + response handling pattern.

- [x] **Create domain API modules**
  - **Task:** Split by domain:
    - `src/api/stationsApi.ts`
    - `src/api/poisApi.ts`
    - `src/api/ownerApi.ts`
    - `src/api/adminApi.ts` (analytics, debug)
    - `src/api/donationsApi.ts`
  - **Impact:** Components no longer use raw `fetch`/URLs; API is discoverable and typed.

### 3.2 Types & DTOs (`src/types/`)

- [x] **Centralize shared types**
  - **Task:** Ensure all entities have dedicated definition files:
    - `station.types.ts`, `poi.types.ts`, `image.types.ts`, `price.types.ts`, `owner.types.ts`, `analytics.types.ts`.
  - **Impact:** Admin and Main app don’t redefine station/poi interfaces in multiple places.

- [x] **Align with backend contracts**
  - **Task:** Review controllers/transformers and update TS types (e.g. `price: number | string`, `operating_hours`, `images`, etc.).
  - **Impact:** Fewer runtime type errors, easier changes when backend evolves.

### 3.3 Constants (`src/constants/`)

- [x] **Centralize endpoints and config**
  - **Task:** Ensure `apiEndpoints.ts` (or equivalent) exports all API paths used by frontend.
  - **Impact:** Simple to change API prefixes or add new versions in one place.

---

## 4. Phase 2 – Admin Portal Modularization (High Priority)

**Objective:** Break `AdminPortal.tsx` into small, focused components and containers while preserving behavior.

### 4.1 Structure

- [x] **Define target folder structure**
  - **Task:** Use/extend something like:
    - `src/components/admin/dashboard/…`
    - `src/components/admin/stations/…`
    - `src/components/admin/pois/…`
    - `src/components/admin/images/…`
    - `src/components/admin/prices/…`
    - `src/components/admin/analytics/…`
  - **Impact:** Logical grouping by feature, easier navigation.

### 4.2 Extract Presentational Components

- [x] **Stations management**
  - **Task:** Extract from `AdminPortal.tsx`:
    - [x] `AdminStationList`
    - [x] `AdminStationForm`
    - [x] `AdminStationMap`
  - **Impact:** Smaller, focused files; easier testing.

- [x] **POIs management**
  - **Task:** Extract:
    - [x] `AdminPoiList`
    - [x] `AdminPoiForm`
  - **Impact:** POI UI can evolve independently.

- [x] **Images & price reports**
  - **Task:** Extract:
    - `AdminImageGallery` (reused `ImageSlideshow`)
    - `AdminPriceReportsPanel`
  - **Impact:** Shared UI for images/prices across admin and other views.

### 4.3 Container + Hook Pattern

- [x] **Create admin containers**
  - **Task:** Replace monolithic `AdminPortal` logic with containers like:
    - `AdminPortalContainer` (tabs, routing, state orchestration)
    - Feature-level containers (e.g. `StationsTabContainer`)
  - **Impact:** Clear separation between data-fetching/logic vs pure UI.

- [x] **Introduce admin hooks**
  - **Task:** Create hooks:
    - `useAdminStations()`, `useAdminPois()`
    - `useAdminPrices()`, `useAdminAnalytics()`
  - **Impact:** Shared logic for fetching, caching, and refresh.

---

## 5. Phase 3 – Main App Modularization (Medium–High Priority)

**Objective:** Break `MainApp.tsx` into map shell, side/bottom sheets, filters, and utility components.

### 5.1 High-Level Structure

- [x] **Map shell & layout**
  - **Task:** Define:
    - `MapShell` (Leaflet map, base layers, user location marker)
    - `MapOverlays` (center button, PWA button, settings, trip recorder, etc.)
  - **Impact:** Map rendering and overlays become composable.

- [x] **Details & sheets**
  - **Task:** Extract:
    - `StationDetailPanel` / `PoiDetailPanel`
    - `MapBottomSheet` integration wrapper
  - **Impact:** Bottom-sheet logic isolated from `MainApp`.

### 5.2 Filters & Search

- [x] **Search/filter controls**
  - **Task:** Move filter UI & logic into:
    - `SearchControlsDesktop`
    - `FilterChipMobile` + `FilterSheetMobile`
  - **Impact:** Easier to adjust UX for mobile vs desktop.

- [x] **Filter state**
  - **Task:** Introduce `useFilters()` hook (or context) shared between map, list, and sheets.
  - **Impact:** Single source-of-truth for filters.

### 5.3 Routing & Follow Camera Integration

- [x] **Routing integration**
  - **Task:** Keep routing logic in hooks:
    - `useRoute()` (already partly existing) + dedicated `RouteDisplay` component.
  - **Impact:** OSRM concerns separated from UI.

- [x] **Follow camera / PWA / settings**
  - **Task:** Ensure:
    - `FollowCameraController`, `CenterToLocationButton`, `PWAInstallButton`, `SettingsButton` are imported and positioned via a consistent overlay mechanism.
  - **Impact:** No more scattered “floating buttons” logic inside `MainApp`.

---

## 6. Phase 4 – Shared State & Hooks Cleanup

**Objective:** Make state and behavior predictable and testable using a small set of shared contexts/hooks (no big new library unless needed).

### 6.1 Global State Boundaries

- [ ] **Define what is global vs local**
  - **Task:** List out state that should be global:
    - Selected station/POI, route, filters, user settings (voice, notifications, keep-screen-on), maybe session info.
  - **Impact:** Fewer prop-drilling chains and surprises.

- [ ] **Create dedicated contexts**
  - **Task:** Implement small, focused contexts:
    - `MapSelectionContext`
    - `FilterContext`
    - `SettingsContext`
  - **Impact:** Components subscribe only to data they care about.

### 6.2 Hooks for Complex Behavior

- [ ] **Encapsulate complex flows**
  - **Task:** Ensure features like:
    - Arrival notifications
    - Trip recording
    - PWA install prompt
    - Follow camera
    - User tracking/analytics heartbeat
    are implemented as hooks with clear, documented inputs/outputs.
  - **Impact:** Behavior easier to test and reason about.

---

## 7. Phase 5 – Backend Architecture Enhancements

**Objective:** Build on existing modularization to solidify service/contract and add docs and monitoring.

### 7.1 Service Layer Consistency

- [ ] **Review services**
  - **Task:** Check `services/` (e.g., `paymentService`, `userActivityTracker`, `supabaseStorage`, `cacheService`) for:
    - Clear interfaces
    - No direct `req/res` usage
  - **Impact:** Controllers remain thin and composable.

- [ ] **Add domain service modules where missing**
  - **Task:** If some business rules live directly in controllers, consider extracting:
    - `stationService`, `poiService`, `priceService`, `ownerService`, `analyticsService`.
  - **Impact:** Easier to test logic without HTTP layer.

### 7.2 API Contracts & Docs

- [ ] **Create or update API reference**
  - **Task:** Create OpenAPI/Swagger definition or at least:
    - `API_REFERENCE.md` with endpoints, request/response shapes, error codes.
  - **Impact:** Easier frontend work, future integrations, and thesis documentation.

- [ ] **Ensure DTOs and transformers match TS types**
  - **Task:** Double-check `utils/transformers.js` fields (addresses, phones, operating_hours, images, prices).
  - **Impact:** Eliminates subtle mismatches (e.g., missing fields in POIs).

### 7.3 Logging & Observability

- [ ] **Structured logging**
  - **Task:** Introduce a simple logger (winston/pino or custom wrapper) and standard log format.
  - **Impact:** Production issues easier to diagnose.

- [ ] **Minimal metrics**
  - **Task:** Log or expose:
    - Request duration
    - Endpoint usage counts
    - Error rates
  - **Impact:** Supports future optimization and thesis metrics.

---

## 8. Phase 6 – Testing & Quality

**Objective:** Add a pragmatic testing layer to avoid regressions, especially after refactors.

### 8.1 Backend Tests

- [ ] **Unit tests for repositories & services**
  - **Task:** Use Jest:
    - Mock DB for repositories where needed.
    - Test core business logic in services (price reporting, donations, routing, analytics).
  - **Impact:** Safe refactoring of backend internals.

- [ ] **Integration tests for critical endpoints**
  - **Task:** Use `supertest` to cover:
    - `/api/stations/nearby`
    - `/api/pois/nearby`
    - `/api/stations/:id/report-price`
    - `/api/user/heartbeat`
    - `/api/donations/create`
  - **Impact:** Confidence that modularization + refactors don’t break key flows.

### 8.2 Frontend Tests

- [ ] **Component tests for core UI**
  - **Task:** Use React Testing Library on:
    - Station list/filter behavior
    - Bottom sheet open/close
    - Admin station creation flow
  - **Impact:** Catch breaking changes early.

- [ ] **Smoke / E2E tests (optional)**
  - **Task:** Add a couple of Playwright/Cypress flows:
    - “User searches, selects station, starts route”
    - “Admin logs in and approves price report”
  - **Impact:** End-to-end sanity checks.

---

## 9. Suggested Order of Execution

1. **Phase 1 – Frontend API & types consolidation**
2. **Phase 2 – Admin Portal modularization**
3. **Phase 3 – Main App modularization**
4. **Phase 4 – Shared state & hooks cleanup**
5. **Phase 5 – Backend service/API docs/logging**
6. **Phase 6 – Tests & basic CI**

---

## 10. Tracking & Checkpoints

- **Short cycles:** Each bullet above should be small enough to finish in 1–3 sessions.
- **Docs:** When a phase is substantially done, add a short note to:
  - [MODULARIZATION_COMPLETE.md](cci:7://file:///home/keil/fuel_finder/DOCUMENTATIONS%20AND%20CONTEXT/MODULARIZATION/MODULARIZATION_COMPLETE.md:0:0-0:0) or a new `FRONTEND_MODULARIZATION_COMPLETE.md`.
- **Rule:** No feature changes mixed with refactors. Keep PRs/commits focused (easier rollback and review).
