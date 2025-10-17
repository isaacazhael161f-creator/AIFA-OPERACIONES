// Minimal SW to stop intercepting requests from an older worker
self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control so the new (no-op) worker stops old fetch handlers
  event.waitUntil(self.clients.claim());
});

// No 'fetch' handler on purpose: let the network handle everything.