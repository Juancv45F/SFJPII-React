// Service worker de la PWA: shell sin conexión.
// - Navegación: red primero; sin red, se sirve el index.html guardado.
// - Recursos estáticos del bundle (/_expo, /assets, iconos): caché primero (sus nombres llevan hash).
// - La API (otro origen) nunca se cachea aquí; el catálogo sin conexión lo maneja la app.
const VERSION = 'sfjpii-v1';
const SHELL = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(cache => cache.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  if (/^\/(_expo|assets)\//.test(url.pathname) || /\.(png|webp|jpg|svg|ttf|woff2?|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then(cache => cache.put(req, copy));
        }
        return res;
      })),
    );
  }
});
