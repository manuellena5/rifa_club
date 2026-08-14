// Rifa del Club — Service Worker
// Subir SW_VERSION en CADA cambio de index.html, manifest.json o este archivo.
const SW_VERSION = '1.8.0';
const CACHE = 'rifa-' + SW_VERSION;

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARCHIVOS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Nunca cachear las llamadas a Apps Script: siempre a la red.
  if (url.hostname.indexOf('script.google') === 0 || url.hostname.indexOf('googleusercontent') >= 0) return;
  if (e.request.method !== 'GET') return;

  // La app: red primero (para tomar cambios), cache si no hay señal.
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {});
        return r;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
