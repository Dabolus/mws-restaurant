const staticCacheName = 'mws-restaurant-static-v3';

// Import Jake Archibald's idb promised library and our DB helper
self.importScripts('https://cdn.jsdelivr.net/npm/idb@2.1.1/lib/idb.min.js', './dbhelper.js');

self.putIntoIDB = (objectStore, objs) =>
  Promise.all((Array.isArray(objs) ? objs : [objs]).map(obj =>
    self.idb.open('restaurant-reviews')
      .then(db => db
        .transaction(objectStore, 'readwrite')
        .objectStore(objectStore)
        .put(obj)
      )
  ));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(staticCacheName).then((cache) => {
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
        'https://fonts.googleapis.com/icon?family=Material+Icons',
        'https://cdn.jsdelivr.net/npm/lozad/dist/lozad.min.js',
        'https://cdn.jsdelivr.net/npm/idb@2.1.1/lib/idb.min.js',
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.idb.open('restaurant-reviews', 1, upgradeDB => {
        switch (upgradeDB.oldVersion) {
          case 0:
            upgradeDB.createObjectStore('restaurants', {
              keyPath: 'id',
            });
          case 1:
            upgradeDB.createObjectStore('reviews', {
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

  // This part might also be abstracted to handle any request to the API
  const requestURL = new URL(event.request.url);
  if (requestURL.pathname.startsWith('/restaurants') || requestURL.pathname.startsWith('/reviews')) {
    const [, store, id] = /^\/([\w]*)\/?([0-9]*)\/?$/g.exec(requestURL.pathname);
    event.respondWith(
      self.idb.open('restaurant-reviews')
        .then(db => {
          const objectStore = db
            .transaction(store)
            .objectStore(store);
          return id ? objectStore.get(id) : objectStore.getAll();
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
              self.putIntoIDB(store, reqObjs);
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

self.addEventListener('sync', (event) =>
  event.waitUntil(
    self.idb.open('restaurant-reviews')
      .then(db => {
        const transaction = db.transaction(['restaurants', 'reviews'], 'readwrite');
        const promises = [];
        const restaurantsStore = transaction.objectStore('restaurants');
        const reviewsStore = transaction.objectStore('reviews');

        restaurantsStore.iterateCursor(cursor => {
          if (!cursor || !cursor.value.needsSync) {
            return;
          }
          const promise = cursor.value.is_favorite ?
            self.DBHelper.favoriteRestaurant(cursor.value.id) :
            self.DBHelper.unfavoriteRestaurant(cursor.value.id);
          promises.push(
            promise.then(() => restaurantsStore.delete(cursor.value.id))
          );
          cursor.continue();
        });
        reviewsStore.iterateCursor(cursor => {
          if (!cursor || !cursor.value.needsSync) {
            return;
          }
          let promise;
          switch (cursor.value.needsSync) {
            case 'create':
              promise = self.DBHelper.addReview(
                cursor.value.restaurant_id,
                cursor.value.name,
                cursor.value.rating,
                cursor.value.comments
              );
              break;
            case 'update':
              promise = self.DBHelper.updateReview(
                cursor.value.id,
                cursor.value.name,
                cursor.value.rating,
                cursor.value.comments
              );
              break;
            case 'delete':
              promise = self.DBHelper.updateReview(cursor.value.id);
              break;
          }
          if (!promise) {
            return;
          }
          promises.push(
            promise.then(() => reviewsStore.delete(cursor.value.id))
          );
          cursor.continue();
        });
        return Promise.all(promises);
      })
  ));
