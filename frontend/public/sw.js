/* Fuel Finder Service Worker */
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `ff-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `ff-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const CORE_ASSETS = [
  '/',
  '/index.html',
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...', CACHE_VERSION);
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(CORE_ASSETS);
        console.log('✅ Core assets cached successfully');
        await self.skipWaiting();
      } catch (error) {
        console.error('❌ Service Worker install failed:', error);
        throw error;
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  console.log('⚡ Service Worker activating...', CACHE_VERSION);
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
            .map((k) => {
              console.log('🗑️ Deleting old cache:', k);
              return caches.delete(k);
            })
        );
        await self.clients.claim();
        console.log('✅ Service Worker activated and claimed clients');
      } catch (error) {
        console.error('❌ Service Worker activation failed:', error);
        throw error;
      }
    })()
  );
});

function isOSMTile(url) {
  return /(^|\.)tile\.openstreetmap\.org$/i.test(url.hostname) ||
         url.hostname.includes('tile.openstreetmap.org');
}

function isAPI(url) {
  // Matches typical API paths (local dev and production if proxied under /api)
  return (
    url.pathname.startsWith('/api') ||
    url.href.includes('localhost:3001/api')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // CRITICAL: Never intercept POST/PUT/PATCH requests
  // This prevents the Service Worker from duplicating upload requests
  if (req.method !== 'GET') {
    console.log('[SW] Ignoring non-GET request:', req.method, req.url);
    return;
  }

  // App navigation requests: try network, fall back to cache, then offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResp = await fetch(req);
          const cache = await caches.open(STATIC_CACHE);
          cache.put(req, networkResp.clone()).catch(() => {});
          return networkResp;
        } catch (err) {
          const cached = await caches.match(req);
          return cached || (await caches.match(OFFLINE_URL));
        }
      })()
    );
    return;
  }

  // Cache strategy for OSM tiles: Stale-While-Revalidate
  if (isOSMTile(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(req);
        if (cached) {
          // Update in background
          fetch(req)
            .then((resp) => {
              if (resp && resp.ok) cache.put(req, resp.clone());
            })
            .catch(() => {});
          return cached;
        }
        try {
          const resp = await fetch(req, { mode: 'cors' });
          if (resp && resp.ok) await cache.put(req, resp.clone());
          return resp;
        } catch (e) {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // API data (stations, routes, pois): Network-First with cache fallback
  if (isAPI(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        try {
          const resp = await fetch(req);
          if (resp && resp.ok) cache.put(req, resp.clone()).catch(() => {});
          return resp;
        } catch (e) {
          const cached = await cache.match(req);
          if (cached) return cached;
          return new Response(JSON.stringify({
            offline: true,
            message: 'Offline - showing last known data if available.'
          }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
          });
        }
      })()
    );
    return;
  }

  // Same-origin static assets: Cache-First
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const resp = await fetch(req);
          if (resp && resp.ok) cache.put(req, resp.clone()).catch(() => {});
          return resp;
        } catch (e) {
          return Response.error();
        }
      })()
    );
    return;
  }

  // Default: go to network
  // You may add more runtime caching cases above if needed.
});
