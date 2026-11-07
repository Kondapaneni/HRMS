// Minimal Service Worker to satisfy PWA installability requirements
// without caching any resources.

self.addEventListener("install", () => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Claim clients immediately so the service worker controls the page
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Empty fetch handler to satisfy PWA installability requirements
  // without intercepting or breaking SPA client-side routing.
});
