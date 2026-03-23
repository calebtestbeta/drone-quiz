const CACHE = 'drone-quiz-v1';
const CDN_CACHE = 'drone-quiz-cdn-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/exam_ch1.json',
  '/exam_ch2.json',
  '/exam_ch3.json',
  '/exam_ch4.json',
];

const CDN_ORIGINS = ['cdn.tailwindcss.com', 'unpkg.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
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
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached || new Response('離線中，請稍後再試', { status: 503 }));
    })
  );
});
