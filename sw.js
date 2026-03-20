// ═══════════════════════════════════════════════
//  SERPEX — Service Worker PWA
//  Cache strategy: Network First (jeu en ligne)
// ═══════════════════════════════════════════════

const CACHE_NAME = 'serpex-v1';

// Fichiers à mettre en cache pour le mode hors-ligne basique
const STATIC_ASSETS = [
  '/serpex/',
  '/serpex/index.html',
  '/serpex/favicon.png',
  '/serpex/manifest.json'
];

// ─── Installation : mise en cache des assets statiques ───
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ─── Activation : nettoyage des anciens caches ───
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch : Network First (priorité réseau pour le jeu online) ───
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET et les API externes (Supabase, AdSense, GA)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isExternal = !url.hostname.includes('serpex-game26.github.io');
  if (isExternal) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache la réponse fraîche
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // Fallback sur le cache si hors ligne
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback ultime : page principale
          return caches.match('/serpex/index.html');
        });
      })
  );
});
