const staticCacheName = 'mws-restaurant-static-v2';

// Import Jake Archibald's idb promised library
self.importScripts('https://cdn.jsdelivr.net/npm/idb@2.1.1/lib/idb.min.js');

self.putIntoIDB = (objs) =>
  Promise.all((Array.isArray(objs) ? objs : [objs]).map(obj =>
    self.idb.open('restaurant-reviews')
      .then(db => db
        .transaction('restaurants', 'readwrite')
        .objectStore('restaurants')
        .put(obj)
      )
  ));

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function (cache) {
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
      ]);
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    Promise.all([
      self.idb.open('restaurant-reviews', 1, upgradeDB => {
        switch (upgradeDB.oldVersion) {
          case 0:
            upgradeDB.createObjectStore('restaurants', {
              keyPath: 'id',
            });
        }
      }),
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.filter((cacheName) =>
            cacheName.startsWith('mws-restaurant-') && cacheName !== staticCacheName
          ).map((cacheName) =>
            caches.delete(cacheName)
          )
        )
      ),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // For some reason, DevTools opening will trigger these o-i-c requests.
  // We will just ignore them to avoid showing errors in console.
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return Promise.resolve();

  const requestURL = new URL(event.request.url);
  if (requestURL.pathname.startsWith('/restaurants')) {
    const [, restaurantId] = /^\/restaurants\/?([0-9]*)\/?$/g.exec(requestURL.pathname);
    event.respondWith(
      self.idb.open('restaurant-reviews')
        .then(db => {
          const objectStore = db
            .transaction('restaurants')
            .objectStore('restaurants');
          return restaurantId ? objectStore.get(restaurantId) : objectStore.getAll();
        })
        .then(idbObjs => {
          // Even if we already saved the restaurants in idb,
          // we start a new request so that the restaurants list
          // can be updated in background. In this way, we will
          // see the updated restaurants next time we open up
          // the website
          const reqPromise = fetch(event.request)
            .then(res => res.json())
            .then(reqObjs => {
              self.putIntoIDB(reqObjs);
              return new Response(JSON.stringify(reqObjs));
            });
          if (idbObjs && Object.keys(idbObjs).length > 0) {
            return new Response(JSON.stringify(idbObjs));
          }
          return reqPromise;
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) =>
        response || fetch(event.request)
      )
    );
  }
});
