// Minimal Service Worker for Fuel Finder
// Provides basic lifecycle hooks and supports registration.showNotification()

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Focus an existing client when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('focus' in client) {
          client.focus();
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow('/');
      }
    })()
  );
});

// Optional: Handle push events if push is added in the future
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const { title, options } = (() => {
    try { return event.data.json(); } catch { return { title: 'Fuel Finder', options: { body: event.data.text() } }; }
  })();
  event.waitUntil(self.registration.showNotification(title || 'Fuel Finder', options || {}));
});
