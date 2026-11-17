/*
  Legacy Service Worker kill-switch

  Why this exists:
  - Older builds may have registered a PWA service worker at /sw.js
  - That worker can cache stale bundles and cause blank screens in preview/dev
    (e.g. "TypeError: Importing a module script failed")

  Current builds register the PWA worker at /pwa-sw.js instead.
  Serving this file at /sw.js forces old registrations to update, then self-unregister.
*/

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Remove this SW registration.
        await self.registration.unregister();
      } catch {
        // ignore
      }

      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch {
        // ignore
      }

      try {
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });

        for (const client of clients) {
          try {
            client.navigate(client.url);
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    })()
  );
});
