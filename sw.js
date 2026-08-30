// ============================================================================
//  sw.js — cache offline. La app entera pesa ~1 MB, asi que la guardamos toda.
//  Al publicar una version nueva, cambiar VERSION: eso invalida el cache viejo.
// ============================================================================

const VERSION = 'minulp-2026-v6';

const ARCHIVOS = [
  './',
  'index.html',
  'editor.html',
  'imprimir.html',
  'manifest.webmanifest',
  'css/app.css',
  'css/fuente.css',
  'fonts/montserrat-latin.woff2',
  'css/marcas.css',
  'js/app.js',
  'js/datos.js',
  'js/geo.js',
  'js/mapa.js',
  'js/cronograma.js',
  'js/buscador.js',
  'js/perfil.js',
  'js/qr.js',
  'img/mapa.webp',
  'img/mapa@2x.webp',
  'img/oficial.webp',
  'img/entorno.svg',
  'img/splash.webp',
  'img/splash-fijo.webp',
  'img/icons/icon-192.png',
  'img/icons/icon-512.png',
  'img/icons/icon-maskable.png',
  'img/logos/ACNUR.webp', 'img/logos/AG.webp', 'img/logos/CAJ.webp', 'img/logos/CDH.webp',
  'img/logos/CS.webp', 'img/logos/ECOSOC.webp', 'img/logos/OIT.webp', 'img/logos/OMS.webp',
  'img/logos/ONUDD.webp', 'img/logos/ONUM.webp', 'img/logos/PNUMA.webp', 'img/logos/STI.webp',
  'img/logos/UNESCO.webp', 'img/logos/UNICEF.webp', 'img/logos/UNODA.webp',
  'img/logos/MINULP.webp', 'img/logos/MINULP-BLANCO.webp',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      // addAll falla entero si falta un archivo: guardamos de a uno para ser tolerantes
      .then((c) => Promise.all(ARCHIVOS.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // navegacion: red primero para tomar actualizaciones, cache si no hay senal
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copia = r.clone();
          caches.open(VERSION).then((c) => c.put(req, copia));
          return r;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('index.html'))),
    );
    return;
  }

  // El resto: servimos del cache (por eso anda sin senal) y de fondo pedimos
  // la version nueva. Asi, si se publica una correccion, la proxima vez que
  // alguien abra la app ya la tiene, sin necesidad de borrar nada a mano.
  e.respondWith(
    caches.open(VERSION).then((cache) => cache.match(req).then((hit) => {
      const red = fetch(req).then((r) => {
        if (r && r.ok) cache.put(req, r.clone());
        return r;
      }).catch(() => hit);
      return hit || red;
    })),
  );
});
