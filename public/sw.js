// Service Worker — fallback de manutenção com cache inteligente
const CACHE_NAME = 'torre2-v1';
const FALLBACKS = [
  '/maintenance.html',
  '/404.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FALLBACKS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  // Limpar caches antigos
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names
          .filter(name => name !== CACHE_NAME && name.includes('torre2'))
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Helper to respond with maintenance fallback (status 503)
async function maintenanceResponse() {
  const cache = await caches.open(CACHE_NAME);
  const resp = await cache.match('/maintenance.html');
  if (resp) {
    // Clonar resposta e retornar com status 503
    return new Response(resp.body, {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/html; charset=utf-8',
        'Retry-After': '3600',
        'Cache-Control': 'no-cache, must-revalidate'
      })
    });
  }
  // Fallback final
  return new Response('<h1>Em manutenção</h1><p>Voltamos em breve.</p>', {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    try {
      const networkResp = await fetch(req, { cache: 'default' });

      // Se é navegação e resposta é 404/5xx, mostrar maintenance
      const isNavigation = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
      if (networkResp && (networkResp.status === 404 || networkResp.status >= 500)) {
        if (isNavigation) return maintenanceResponse();
      }

      return networkResp;
    } catch (err) {
      // Network falhou — se for navegação, mostrar maintenance
      const isNavigation = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
      if (isNavigation) return maintenanceResponse();
      
      // Para assets, tentar cache; se falhar, retornar erro
      const cached = await caches.match(req);
      if (cached) return cached;
      
      return new Response('Offline', { status: 503 });
    }
  })());
});

// Listen to messages (optional): allow client to trigger bypass
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'skipWaiting') {
    self.skipWaiting();
  }
});
