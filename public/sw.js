const CACHE_NAME = 'aerotoon-v2';
const OFFLINE_URL = '/';

// Pre-cache essential shell assets on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // credentials: 'omit' — oturum çerezi olmadan çekilir, böylece kişiselleştirilmiş
      // (giriş yapmış kullanıcıya özel) bir HTML offline kopyası olarak saklanmaz.
      return cache.add(new Request(OFFLINE_URL, { credentials: 'omit' }));
    })
  );
  self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy with cache fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip non-http/https requests (chrome-extension, file://, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Skip API and auth routes
  if (url.pathname.startsWith('/api/')) return;

  // Kimlik doğrulamalı / kişisel isteklere ASLA dokunma (cache'e girmez, SW'den geçmez)
  if (event.request.headers.has('authorization')) return;
  if (/^\/(admin-panel|admin5|profile|login|register|dogrulama)(\/|$)/.test(url.pathname)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico)$/))) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Return cached version or offline page
        return caches.match(event.request).then((cached) => {
          return cached || caches.match(OFFLINE_URL);
        });
      })
  );
});
