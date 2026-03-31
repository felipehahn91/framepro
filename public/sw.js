const CACHE_NAME = 'frame-pro-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Listener de fetch aprimorado para não quebrar a aplicação caso a rede falhe
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não sejam GET (como salvamento de dados)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const response = await caches.match(event.request);
      return response || new Response("Erro de conexão. Tente novamente quando estiver online.", {
        status: 503,
        statusText: "Service Unavailable",
        headers: new Headers({ "Content-Type": "text/plain" })
      });
    })
  );
});