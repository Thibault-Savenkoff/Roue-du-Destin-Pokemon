const CACHE = 'roue-destin-v6';

const PRECACHE = [
    './',
    './index.html',
    './settings.html',
    './data.json',
    './js/data.js',
    './js/sounds.js',
    './js/app.js',
    './js/draft.js',
    './js/peer.js',
    './js/export.js',
    './js/naming.js',
    './js/typeChart.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const url = e.request.url;

    // PeerJS CDN : network-first (P2P indisponible offline mais sans crash)
    if (url.includes('unpkg.com')) {
        e.respondWith(
            fetch(e.request).catch(() => caches.match(e.request))
        );
        return;
    }

    // Tout le reste : cache-first
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});
