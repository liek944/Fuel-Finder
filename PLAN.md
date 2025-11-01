# Mobile Bottom Sheet for Marker Details (Google Maps–style)

Status: Approved defaults
Scope: Implement mobile-only bottom sheet for marker details while keeping desktop popups.

## Goals
- Improve mobile ergonomics and readability.
- Avoid popup auto-pan jumps; keep selected marker visible above the sheet.
- Preserve all current information and actions for stations/POIs.

## UX Specification
- Open behavior: Tapping a marker opens a bottom sheet in collapsed state (~96px height) showing:
  - Name, distance, short fuel price summary, and a primary action (Directions).
- Expansion: Tap or drag handle to expand to ~70vh with full details.
- Dismiss: Drag down, tap backdrop/map, or close button.
- Selected marker highlight: Subtle ring/scale to indicate selection.
- Map pan: When sheet opens/expands, pan so the selected marker sits above the sheet.
- Actions in sheet:
  - Get Directions / Clear Route
  - Call (if phone exists)
  - PriceReportWidget
  - ReviewWidget
  - Images carousel
- Back button: On Android, Back closes the sheet first.
- Desktop: Keep existing Leaflet popups unchanged.

## Theming
- Colors: Light-blue and white
  - Primary: #2196F3
  - Primary hover/active: #1976D2
  - Accents and backgrounds use white (#FFFFFF) with subtle shadow (#0000001F) and borders (#E0E0E0).
- Corners: 16px radius; drag handle 36px width, 4px height, #BDBDBD.

## Architecture & Components
- State (MainApp.tsx)
  - `selectedItem: { type: "station" | "poi"; data: Station | POI } | null`
  - `isSheetOpen: boolean` with modes `collapsed | expanded` (internal to sheet component but controlled by parent for close/open).
  - `selectedId` passed to marker renderer for highlighting.
- Components
  - `components/map/MapBottomSheet.tsx`
    - Props: `open`, `mode`, `onClose`, `onExpand`, `onCollapse`, `children`, `header`, `footer`.
    - Behavior: Collapsed/expanded states, drag-to-expand/collapse, backdrop, portal to `document.body`.
    - Accessibility: Focus trap when expanded, ESC → close, ARIA roles/labels.
  - `components/details/StationDetail.tsx` and `components/details/PoiDetail.tsx`
    - Refactor current popup JSX into reusable detail components.
    - Accept callbacks: `onGetDirections`, `onClearRoute`, `onCall`.
- Hooks/Utilities
  - `useIsMobile()` (width <= 768) to gate bottom sheet vs popup.
  - `useMapPanForSheet(map, markerLatLng, sheetHeight)` to panBy/flyTo.

## Data Flow
1. User taps marker → if mobile, set `selectedItem` and open sheet in `collapsed` mode; if desktop, show Popup.
2. Sheet `onExpand` pans map further if needed; `onClose` clears selection and removes highlight.
3. Actions inside details call up to `MainApp` (same handlers as popup today: `getRoute`, `clearRoute`).

## Map Behavior
- On open: `map.panBy([0, -sheetHeight/2])` (or `map.flyTo` with padding) to keep marker above the sheet.
- On close: No pan change; user control preserved.
- Follow camera: No changes; sheet presence should not block recenter button.

## Z-Index and Overlays
- Sheet z-index: 1200 (above map, below modals).
- Ensure it doesn’t overlap essential floating buttons:
  - Voice toggle, center-to-location, PWA install button. Adjust bottom spacing and responsive positions.

## Analytics (optional)
- `sheet_open`, `sheet_expand`, `sheet_collapse`, `sheet_close` with `type`, `id`.

## Implementation Steps
1. Refactor popup content into `StationDetail` and `PoiDetail` components (no behavior change). ✅ Step 1 Complete
2. Implement `MapBottomSheet.tsx` with collapsed/expanded states, drag handle, backdrop, and basic a11y. ✅ Step 2 Complete
3. Wire marker clicks: ✅ Step 3 Complete
   - Mobile: open sheet collapsed with `selectedItem`.
   - Desktop: continue using Popups.
4. Map pan/offset to keep marker visible above sheet; handle resize/orientation changes. ✅ Step 4 Complete
5. Integrate actions inside details: Directions/Clear Route, Call (if phone), PriceReportWidget, ReviewWidget, ImageSlideshow. ✅ Step 5 Complete
6. Highlight selected marker during sheet open. ✅ Step 6 Complete
7. QA and polish: a11y, performance, gesture conflicts, z-index with floating buttons. ✅ Step 7 Complete
8. Documentation updates; consider removing `PopupScaleFix` for mobile path. ✅ Step 8 Complete

## Acceptance Criteria
- Mobile: Marker tap opens a bottom sheet (collapsed). User can expand to 70vh and see all info and actions. Map pans to keep marker visible. Dismiss via drag/backdrop/close. Android Back closes the sheet.
- Desktop: Leaflet Popups remain unchanged.
- No regressions to routing, follow camera, price reporting, reviews, or images.

## Risks & Mitigations
- Gesture conflicts (scroll vs map pan): Use backdrop intercept; enable scroll inside sheet; stopPropagation on sheet.
- Performance on low-end devices: Use CSS transitions only; avoid unnecessary re-renders; memoize details.
- Z-index collisions: Verify against existing floating UI; adjust positions.

## Rollout & Flags
- Mobile-only gating via `useIsMobile`.
- Feature can be toggled by an env flag later if needed.

## Testing Plan
- Devices: Small/medium phones, tablet portrait/landscape.
- Interactions: Tap open, drag expand/collapse, backdrop tap, Back button, orientation change.
- Actions: Get Directions/Clear Route, Call, price report, review, carousel navigation.
- Accessibility: Keyboard navigation when expanded; focus trapping; screen reader labels.

## Timeline (estimate)
- Refactor + BottomSheet + wiring: 1–2 days including QA.
