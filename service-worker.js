const CACHE_NAME = "PNR-CACHE-Version-4.6-FixCORS"; // ⚡ Tukar versi di sini untuk paksa browser update!
const ASSETS = [
  './',
  './index.html',
  './form.html',
  './manifest.json',
  './css/style.css',
  
  // Fail logik JavaScript tempatan (Kritikal untuk fungsi offline)
  './js/config.js',
  './js/api.js',
  './js/auth.js',
  './js/map.js',
  './js/filter.js',
  './js/charts.js',
  './js/exports.js',
  './js/users.js',
  './js/records.js',
  './js/dashboard.js',
  './js/kpi.js',
  './js/main.js',
  './js/nlp-bot.js',
  
  // Pustaka CDN Luar yang digunakan sistem
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // ⚡ PAKSA AKTIF: Menyingkirkan draf menunggu lama tanpa perlu tutup tab browser
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Menyimpan aset ke dalam cache...');
      return cache.addAll(ASSETS);
    })
  );
});

// Pembantu Dwi-Lapisan Pemutus Sesi Cache Lama
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // ⚡ BYPASS 1: Jangan pernah mintas API calls ke Google Apps Script.
  // Biarkan browser handle sendiri secara langsung tanpa Service Worker campur tangan.
  // Ini mengelakkan ralat "Failed to convert value to 'Response'" apabila CORS block berlaku.
  if (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com') {
    return; // Jangan panggil e.respondWith() — serahkan sepenuhnya kepada browser
  }

  // ⚡ BYPASS 2: Jangan cache POST requests (cth: form submissions)
  if (e.request.method !== 'GET') {
    return;
  }

  const destination = e.request.destination;
  const isCoreCritical = (destination === 'document' || destination === 'script' || destination === 'style');

  if (isCoreCritical) {
    // ⚡ STRATEGI NETWORK-FIRST untuk HTML, JS, CSS
    // Sentiasa cuba dapatkan versi terkini dari rangkaian dahulu.
    // Simpan salinan terbaru dalam cache untuk kegunaan offline.
    e.respondWith(
      fetch(e.request).then((networkResponse) => {
        // Hanya cache response yang berjaya dan sah
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Rangkaian gagal (offline) — fallback ke cache
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Tiada cache langsung — fallback ke index.html untuk navigation requests
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline - Sumber tidak tersedia', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
    );
  } else {
    // ⚡ STRATEGI CACHE-FIRST untuk aset lain (gambar, font, pustaka CDN, dll.)
    // Kekalkan offline support supaya borang bancian sentiasa berfungsi.
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Tiada dalam cache — cuba ambil dari rangkaian
        return fetch(e.request).then((networkResponse) => {
          return networkResponse;
        }).catch(() => {
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline - Sumber tidak tersedia', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
    );
  }
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('Memadam cache lama:', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});
