const CACHE_NAME = "screendeck-v1";
const MEDIA_CACHE_NAME = "screendeck-media-v1";

// Files to cache on install
const STATIC_ASSETS = ["/", "/player"];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== MEDIA_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Handle media files (from GCS)
  if (url.hostname.includes("storage.googleapis.com")) {
    event.respondWith(
      caches.open(MEDIA_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            return response;
          }

          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Handle API requests - network first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Handle static assets - cache first
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok && event.request.method === "GET") {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});

// Background sync for playback logs
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-playback-logs") {
    event.waitUntil(syncPlaybackLogs());
  }
});

async function syncPlaybackLogs() {
  // This would be implemented with IndexedDB access
  // For now, the main app handles log syncing
  console.log("Background sync triggered");
}
