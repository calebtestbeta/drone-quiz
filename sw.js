const CACHE = 'drone-quiz-v6';
const CDN_CACHE = 'drone-quiz-cdn-v1';
const CDN_PRECACHE = [
  'https://unpkg.com/three@0.160.1/build/three.min.js',
];

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/game.html',
  '/game/game.css',
  '/game/app.mjs',
  '/game/state.mjs',
  '/game/input-controller.mjs',
  '/game/flight-controller.mjs',
  '/game/scene.mjs',
  '/game/camera-controller.mjs',
  '/game/ui-controller.mjs',
  '/game/mission-definitions.mjs',
  '/game/mission-engine.mjs',
  '/game/scoring.mjs',
  '/game/session-store.mjs',
  '/exam_ch1.json',
  '/exam_ch2.json',
  '/exam_ch3.json',
  '/exam_ch4.json',
  '/normal_ch1.json',
  '/normal_ch2.json',
  '/normal_ch3.json',
  '/normal_ch4.json',
];

const CDN_ORIGINS = ['cdn.tailwindcss.com', 'unpkg.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    Promise.all([
      caches.open(CACHE).then(c => c.addAll(PRECACHE)),
      caches.open(CDN_CACHE).then(c => c.addAll(CDN_PRECACHE)).catch(() => undefined),
    ])
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE && k !== CDN_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // CDN resources: stale-while-revalidate
  if (CDN_ORIGINS.some(o => url.hostname.includes(o))) {
    e.respondWith(
      caches.open(CDN_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fresh = fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fresh;
        })
      )
    );
    return;
  }

  // Local resources: cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const cloned = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, cloned));
        }
        return res;
      }).catch(() => cached || new Response('離線中，請稍後再試', { status: 503 }));
    })
  );
});
