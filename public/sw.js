const CACHE_NAME = 'frame-pro-v1';

// O service worker básico apenas para permitir a instalação como PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Estratégia de rede primeiro para garantir que o CRM esteja sempre atualizado
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});