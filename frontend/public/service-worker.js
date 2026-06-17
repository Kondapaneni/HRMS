// Minimal Service Worker to satisfy PWA installability requirements
// without caching any resources.

self.addEventListener("install", (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Claim clients immediately so the service worker controls the page
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass all requests to the network directly
  // This satisfies the PWA fetch handler requirement without actually caching anything
  event.respondWith(fetch(event.request));
});
