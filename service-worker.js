// Service Worker — Contas Em Pé
//
// Estratégia: cache-first com pré-cache no install. Tudo o que a app
// precisa para correr (HTML, JS local, manifest, ícones, e CDNs externos
// — React, Babel, Tailwind, Caveat font) é descarregado uma única vez na
// primeira visita online. Depois disso a app abre 100% offline para
// sempre.
//
// Para forçar update: incrementa CACHE_VERSION. O install do novo SW
// cria um cache fresco; o activate apaga o antigo. O utilizador
// pode ter de reabrir a app uma vez online para o novo
// SW activar.

const CACHE_VERSION = 'contas-em-pe-v20260508-1349';

// Required: app não corre sem isto.
const LOCAL_REQUIRED = [
  './',
  './index.html',
  './logic.js',
  './manifest.webmanifest',
  './icons/icon.svg',
];

// Opcional: pré-cacheia se existir, ignora 404 (caso os PNGs ainda não tenham
// sido gerados via tools/render_icons.html).
const LOCAL_OPTIONAL = [
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // Required: se algum falhar, install falha (correcto).
    await cache.addAll(LOCAL_REQUIRED);
    // Optional + CDNs: tolera falhas individuais. Usa modo default
    // (`cors` para cross-origin), NÃO `no-cors` — porque o index.html
    // carrega React/ReactDOM com atributo `crossorigin`, fazendo
    // request `cors`. Cachear como opaque (no-cors) faria o
    // respondWith ser rejeitado quando servimos do cache para essa
    // request `cors`, e o app não arrancaria offline. Os CDNs usados
    // (cdnjs, unpkg, cdn.tailwindcss, fonts.googleapis) suportam CORS.
    await Promise.all([...LOCAL_OPTIONAL, ...CDN_ASSETS].map(async (url) => {
      try {
        const res = await fetch(url);
        if (res && res.ok) {
          await cache.put(url, res);
        } else if (res) {
          console.warn('[SW] resposta não-OK ao pré-cachear', url, res.status);
        }
      } catch (e) {
        console.warn('[SW] não foi possível pré-cachear', url, e);
      }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Só interessa GET; outros métodos passam directos à rede.
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    // Cache-first
    const cached = await caches.match(req, { ignoreVary: true });
    if (cached) {
      // Background revalidation: actualiza o cache se possível, sem bloquear.
      fetch(req).then(res => {
        if (res && res.ok) {
          caches.open(CACHE_VERSION).then(c => c.put(req, res));
        }
      }).catch(() => {});
      return cached;
    }
    // Não estava em cache — tenta rede e adiciona ao cache.
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy));
      }
      return res;
    } catch (e) {
      // Sem rede e sem cache — fallback para a página principal se for
      // uma navegação. Outros recursos falham silenciosamente.
      if (req.mode === 'navigate') {
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
      }
      throw e;
    }
  })());
});
