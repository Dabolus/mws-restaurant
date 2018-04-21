const staticCacheName = 'mws-restaurant-static-v1';

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      return cache.addAll([
        'index.html',
        'restaurant.html',
        'js/dbhelper.js',
        'js/main.js',
        'js/restaurant_info.js',
        'css/common.css',
        'css/main.css',
        'css/restaurant.css',
        'img/logo.svg',
        'https://use.fontawesome.com/releases/v5.0.8/js/solid.js',
        'https://use.fontawesome.com/releases/v5.0.8/js/regular.js',
        'https://use.fontawesome.com/releases/v5.0.8/js/fontawesome.js',
        'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.0/normalize.min.css',
        'https://cdn.jsdelivr.net/npm/idb@2.1.1/lib/idb.min.js',
      ]);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('mws-restaurant-') &&
            cacheName !== staticCacheName;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});
