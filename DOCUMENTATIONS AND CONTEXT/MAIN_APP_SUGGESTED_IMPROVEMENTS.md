# Main App Suggested Improvements

Updated: 2025-10-28
Scope: frontend/src/components/MainApp.tsx and related UX/docs. Focus on Security, UI/UX, Performance, Accessibility, and Documentation.

## Summary of Findings
- Alert dialogs block UX and feel jarring on mobile.
- Marker icons are re-drawn on every render; no caching.
- Fetch calls lack cancellation and uniform error checks.
- Price values from PostgreSQL can be strings; comparisons may be wrong without coercion.
- Notifications permission requested on mount; should be user-initiated.
- Many inline styles and `window.innerWidth` checks; better handled via CSS/media queries.
- Emoji-only buttons lack accessible labels and focus management.
- Docs are rich but lack an index and a central security overview.

## Prioritized Recommendations

### High Priority
- Replace `alert()` with toasts/inline notices
  - What: Use a lightweight toast system or inline banners in the search panel/popup.
  - Why: Non-blocking, better on mobile, consistent feedback.
  - Where: `routeToNearestPOI()` closed-skips; success/error messages.

- Cache Leaflet marker icons
  - What: Memoize icons keyed by `brand|open/closed|sizeKey` (quantize proximity).
  - Why: Avoid canvas re-draw cost and layout thrash on large datasets.
  - Where: `createFuelStationIcon`, `createPOIIcon`.

- Add AbortController and uniform error handling to fetches
  - What: Cancel in-flight requests on effect cleanup; check `response.ok`.
  - Why: Prevent race conditions and state updates after unmount.
  - Where: Stations, POIs, Routes, Recent Price Reports.

- Fix price types and filter coercion
  - What: Set `price: number | string`; coerce with `Number(...)` when filtering and displaying.
  - Why: PostgreSQL NUMERIC returns strings; prevents subtle bugs/crashes.
  - Where: Station filter (`matchesPrice`) and all displays.

- Accessibility pass for controls
  - What: `aria-label` for emoji buttons, `role="switch"` for toggles, visible focus rings, adequate hit targets.
  - Why: Screen reader and keyboard usability, WCAG compliance.

### Medium Priority
- Defer Notifications permission to explicit user action
  - What: Request permissions when user enables notifications/voice, not on mount.
  - Why: Respect user intent and platform constraints (esp. Safari).

- Move inline styles to CSS and use media queries
  - What: Replace `window.innerWidth` checks with CSS; centralize styles.
  - Why: Maintainability, theming, better a11y.

- Extract components and reuse shared types
  - What: Extract `PriceReportWidget` and reuse existing `common/ImageSlideshow.tsx`; import shared types from `types/station.types.ts`.
  - Why: Reduce duplication, improve cohesion.

- Add “Open now” filter and sorting
  - What: Checkbox to filter open locations; sort by distance/price.
  - Why: Matches user expectations; complements closed-skip logic.

### Low Priority
- Marker clustering at low zoom
  - What: Add clustering (e.g., `react-leaflet-cluster`).
  - Why: Performance and visual clarity with dense markers.

## Security Recommendations
- Permission prompts
  - Defer notifications prompt until user toggle; handle denial gracefully; persist preference.

- Input validation and sanitization
  - Validate/sanitize `notes` server-side; keep React escaping on client; never render untrusted HTML.

- Transport and policy
  - Enforce HTTPS; adopt a CSP (default-src 'self'; connect-src API base; img-src CDN/API; block inline eval).
  - Document CORS policy and allowed origins; avoid wildcard in production.

- Secrets and owner API keys
  - Keep keys out of URLs; store in memory where possible; if using localStorage, document risks, advise rotation, and rate limit per owner.

- Error handling
  - Avoid leaking stack traces; return user-friendly messages; log details server-side.

## UI/UX Enhancements
- Toasts/banners for feedback instead of alerts.
- Consistent status chips (routing, closed) and success/error styles.
- Responsive layout via CSS; reduce inline styles.

## Performance Improvements
- Icon caching for stations/POIs.
- Memoize `filteredStations` and `uniqueBrands` with `useMemo`.
- Gate verbose logs behind an env flag (e.g., `VITE_DEBUG`).

## Accessibility Improvements
- Add `aria-label` to 📍, 🔊/🔇, 🔔/🔕, close buttons.
- Ensure keyboard focus is visible; larger tap targets (~44px min).
- Verify color contrast ratios for badges and buttons.

## Documentation Actions
- Add `DOCUMENTATIONS AND CONTEXT/INDEX.md` to navigate existing guides.
- Add `SECURITY.md` (CSP, CORS, permissions, API keys, threat model, abuse prevention).
- Add `ACCESSIBILITY_CHECKLIST.md` (roles, labels, focus, contrast, motion, keyboard).
- Note in API docs that PostgreSQL numeric values may be strings.

## Implementation Plan (Incremental)
1) Toasts + replace `alert()` usages; wire success/error in existing panels.
2) Icon cache for fuel/POI markers; quantize proximity and key cache.
3) AbortController + `response.ok` checks for all fetches.
4) Type fixes and `Number(...)` coercion in filters/displays.
5) Accessibility labels/focus; basic CSS cleanups for inline styles.
6) Defer notifications permission; persist setting.
7) Optional: “Open now” filter + sorting; marker clustering; full CSS extraction.

## Test Checklist
- Price report: success and failure show non-blocking feedback; no alerts.
- Route to nearest: banner/toast shows skipped closed stations; route still works.
- Refresh/abort: rapid radius/brand changes do not cause console errors.
- Prices: filtering by max price matches stations correctly when prices are strings.
- A11y: keyboard can reach buttons; screen reader announces labels.
- Notifications: no prompt on first load; prompt only after toggle click; denial handled.
- Performance: panning/zooming remains smooth; no icon flicker with many markers.

## Rollback Considerations
- Feature-flag toasts and icon caching behind simple booleans for quick disable.
- Keep old code paths commented or behind flags during rollout, then remove after validation.

## References
- Main component: `frontend/src/components/MainApp.tsx`
- Follow camera: `frontend/src/components/FollowCameraController.tsx`, `hooks/useFollowCamera.ts`
- Docs: `DOCUMENTATIONS AND CONTEXT/` (consider adding `INDEX.md`) 
