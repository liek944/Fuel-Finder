AI Prompt Roadmap — Trip Replay Feature for Fuel Finder

(Engineer-optimized prompts for unique, production-quality outputs)

🧩 Phase 1 — Core Data Capture

You are a senior full-stack engineer specializing in geolocation-based web applications.
Build a real-time location recorder using navigator.geolocation.watchPosition().
Log { latitude, longitude, timestamp } every few seconds during a driving session.

Requirements:

Manual Start and Stop buttons.

Automatic error handling and fallback logic.

Lightweight data storage in IndexedDB for persistence.

Battery-efficient update intervals.

Output: a working HTML/JS component ready for integration into the Fuel Finder map page.

🧩 Phase 2 — Trip Session Management

You are designing a robust Trip Session Manager for a mapping web app.
Implement logic that groups recorded GPS points into trips with fields: { id, name, startTime, endTime, coordinates[] }.

Requirements:

CRUD operations (Create, Read, Rename, Delete trips).

Persistent storage via IndexedDB.

Clean async functions for saving/loading trips.

Output: complete JS module managing multiple trip sessions with reliable local storage handling.

🧩 Phase 3 — Route Visualization

As a geospatial front-end engineer, create a route visualization module using Leaflet.
Load a saved trip’s coordinates, render them as a smooth polyline, and auto-fit the map bounds to display the route.

Requirements:

Dynamic color gradient along the route.

Start and End markers.

Reusable component for multiple trips.

Output: production-ready HTML/JS for rendering trip routes on the Fuel Finder map view.

🧩 Phase 4 — Replay Animation

As a senior JavaScript engineer, implement a trip replay animation.
Animate a vehicle marker following the recorded route coordinates.

Requirements:

Smooth animation using requestAnimationFrame().

Adjustable playback speed (1x–4x).

Synchronize marker position and route progress visually.

Mobile-friendly, efficient performance.

Output: a reusable animation controller integrated with the Leaflet map.

🧩 Phase 5 — Playback Controls

You are building the interactive UI for the replay system.
Add Play, Pause, Restart, and Speed Control buttons that fully sync with the replay animation state.

Requirements:

Clean UI layout (HTML + CSS).

State indicators (e.g., “Playing”, “Paused”).

Responsive for both desktop and mobile.

Output: integrated playback control bar with working event listeners and animation hooks.

🧩 Phase 6 — Trip Summary & Analytics

As a data visualization engineer, create a trip summary analytics card.
Compute metrics:

Total distance (Haversine or turf.js)

Duration (start–end timestamps)

Average speed

Estimated fuel cost (based on configurable price per km)

Display this summary below the map in a styled component.

Output: complete logic and UI for summary generation after each replay.

🧩 Phase 7 — Optimization & Polish

You are optimizing a web-based trip playback feature for smooth long-distance animations.
Apply the following improvements:

Simplify geometry using turf.simplify() to reduce points.

Throttle map updates for efficiency.

Implement a progress bar showing playback progress.

Add optional trip title, speed indicator, and timestamp overlay.

Output: performance-optimized and visually refined final version of the replay feature.

🌿 Optional Uniqueness Enhancers

Extend the feature for Fuel Finder’s unique use case:

Highlight fuel stops along the replay.

Color-code route segments by fuel efficiency or traffic delay.

Add an eco-score summary and fuel cost breakdown overlay.

Output: enhanced replay system emphasizing fuel-related analytics and eco-friendly driving visualization.

🧠 Stretch Feature Prompts

Implement offline replay with cached map tiles and route data.

Export trip as GeoJSON / CSV.

Generate a shareable replay link with public viewing access.

Add live tracking replay sync (follow the current drive in real-time).