const idbPromise = self.idb.open('restaurant-reviews', 2, upgradeDB => {
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore('restaurants', {
        keyPath: 'id',
      });
    case 1:
      upgradeDB.createObjectStore('reviews', {
        keyPath: 'id',
      });
      upgradeDB.createObjectStore('pendingRequests', {
        keyPath: 'id',
        autoIncrement: true,
      });
  }
  return upgradeDB;
});

/**
 * Common database helper functions.
 */
self.DBHelper = class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   * @returns {string} The database URL.
   */
  static get DATABASE_URL() {
    return 'http://localhost:1337';
  }

  /**
   * Fetch all restaurants.
   * @returns {Promise<object[] | Error>} A promise that resolves to the list of restaurants.
   */
  static fetchRestaurants() {
    return fetch(`${DBHelper.DATABASE_URL}/restaurants`)
      .then(res => res.json());
  }

  /**
   * Fetch a restaurant by its ID.
   * @param {number} id The ID of the restaurant to fetch.
   * @returns {Promise<object | Error>} A promise that resolves to the restaurant with the given ID.
   */
  static fetchRestaurantById(id) {
    // fetch all restaurants with proper error handling.
    return Promise.all([
      fetch(`${DBHelper.DATABASE_URL}/restaurants/${id}`).then(res => res.json()),
      fetch(`${DBHelper.DATABASE_URL}/reviews/?restaurant_id=${id}`).then(res => res.json()),
    ])
    // TODO: replace Object.assign with object spread as soon as it gets more browsers support
      .then(([restaurants, reviews]) => Object.assign({}, restaurants, {reviews}));
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   * @param {string} cuisine The cuisine to filter the restaurants by.
   * @returns {Promise<object[] | Error>} A promise that resolves to the list of restaurants with the given cuisine.
   */
  static fetchRestaurantByCuisine(cuisine) {
    // Fetch all restaurants  with proper error handling
    return DBHelper.fetchRestaurants()
      .then(restaurants => restaurants.filter(r => r.cuisine_type === cuisine));
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   * @param {string} neighborhood The neighborhood to filter the restaurants by.
   * @returns {Promise<object[] | Error>} A promise that resolves to the list of restaurants with the given neighborhood.
   */
  static fetchRestaurantByNeighborhood(neighborhood) {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants()
      .then(restaurants => restaurants.filter(r => r.neighborhood === neighborhood));
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   * @param {string} cuisine The cuisine to filter the restaurants by.
   * @param {string} neighborhood The neighborhood to filter the restaurants by.
   * @returns {Promise<object[] | Error>} A promise that resolves to the list of restaurants with the given cuisine and neighborhood.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants()
      .then(restaurants => {
        let results = restaurants;
        if (cuisine !== 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type === cuisine);
        }
        if (neighborhood !== 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood === neighborhood);
        }
        return results;
      });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   * @returns {Promise<string[] | Error>} A promise that resolves to the list of neighborhoods.
   */
  static fetchNeighborhoods() {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants()
    // Get all neighborhoods from all restaurants
      .then(restaurants => restaurants.map(r => r.neighborhood))
      // Remove duplicates from neighborhoods
      .then(neighborhoods => neighborhoods.filter((n, i) => neighborhoods.indexOf(n) === i));
  }

  /**
   * Fetch all cuisines with proper error handling.
   * @returns {Promise<string[] | Error>} A promise that resolves to the list of cuisines.
   */
  static fetchCuisines() {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants()
    // Get all cuisines from all restaurants
      .then(restaurants => restaurants.map(r => r.cuisine_type))
      // Remove duplicates from cuisines
      .then(cuisines => cuisines.filter((c, i) => cuisines.indexOf(c) === i));
  }

  /**
   * Restaurant page URL.
   * @param {object} restaurant The restaurant to get the URL of.
   * @returns {string} The URL for the given restaurant.
   */
  static urlForRestaurant(restaurant) {
    return `restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   * @param {object} restaurant The restaurant to get the image URLs of.
   * @returns {object} An key-value object containing the restaurant image sources in different sizes.
   */
  static imageUrlsForRestaurant(restaurant) {
    return {
      '1x': `img/${restaurant.photograph || 'placeholder'}_1x.jpg`,
      '2x': `img/${restaurant.photograph || 'placeholder'}_2x.jpg`,
    };
  }

  /**
   * Map marker for a restaurant.
   * @param {object} restaurant The restaurant to place the marker of inside the map.
   * @param {object} map The map to place the marker of the restaurant in.
   * @returns {object} The marker placed inside the given map for the given restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    return new self.google.maps.Marker({
      map,
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      animation: self.google.maps.Animation.DROP,
    });
  }

  static favoriteRestaurant(restaurantId) {
    return fetch(`${DBHelper.DATABASE_URL}/restaurants/${restaurantId}?is_favorite=true`, {
      method: 'PUT',
    }).then(res => res.json())
      .then(res => idbPromise
        .then(db => db
          .transaction('restaurants', 'readwrite')
          .objectStore('restaurants')
          .put(res))
        .then(() => res))
      .catch(() => idbPromise
        .then(db => db
          .transaction('restaurants')
          .objectStore('restaurants')
          .get(restaurantId)
          .then(restaurant => db
            .transaction('restaurants', 'readwrite')
            .objectStore('restaurants')
            .put(Object.assign({}, restaurant, {
              // eslint-disable-next-line camelcase
              is_favorite: true,
            }))))
        .then(() => Promise.reject(new Error('Unable to sync with the server'))));
  }

  static unfavoriteRestaurant(restaurantId) {
    return fetch(`${DBHelper.DATABASE_URL}/restaurants/${restaurantId}?is_favorite=false`, {
      method: 'PUT',
    }).then(res => res.json())
      .then(res => idbPromise
        .then(db => db
          .transaction('restaurants', 'readwrite')
          .objectStore('restaurants')
          .put(res))
        .then(() => res))
      .catch(() => idbPromise
        .then(db => db
          .transaction('restaurants')
          .objectStore('restaurants')
          .get(restaurantId)
          .then(restaurant => db
            .transaction('restaurants', 'readwrite')
            .objectStore('restaurants')
            .put(Object.assign({}, restaurant, {
              // eslint-disable-next-line camelcase
              is_favorite: false,
            }))))
        .then(() => Promise.reject(new Error('Unable to sync with the server'))));
  }

  /* eslint-disable camelcase */
  static addReview(restaurant_id, name, rating, comments) {
    return fetch(`${DBHelper.DATABASE_URL}/reviews`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurant_id,
        name,
        rating,
        comments,
      }),
    }).then(res => res.json())
      .then(res => idbPromise
        .then(db => db
          .transaction('reviews', 'readwrite')
          .objectStore('reviews')
          .put(Object.assign({}, res, {
            restaurant_id,
            name,
            rating,
            comments,
          })))
        .then(() => res))
      .catch(() => idbPromise
        .then(db => {
          const tempId = Date.now();
          return db
            .transaction('reviews', 'readwrite')
            .objectStore('reviews')
            .put({
              restaurant_id,
              name,
              rating,
              comments,
              id: tempId,
              createdAt: tempId,
              updatedAt: tempId,
            })
            .then(() => DBHelper.enqueueRequest('addReview', {
              params: [restaurant_id, name, rating, comments],
              tempId,
              objectStore: 'reviews',
            }));
        })
        .then(() => Promise.reject(new Error('Unable to sync with the server'))));
  }

  /* eslint-enable camelcase */

  static updateReview(reviewId, name, rating, comments) {
    return fetch(`${DBHelper.DATABASE_URL}/reviews/${reviewId}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        rating,
        comments,
      }),
    }).then(res => res.json());
  }

  static deleteReview(reviewId) {
    return fetch(`${DBHelper.DATABASE_URL}/reviews/${reviewId}`, {
      method: 'DELETE',
    }).then(res => res.json());
  }

  static enqueueRequest(method, options) {
    return idbPromise.then(db => db
      .transaction('pendingRequests', 'readwrite')
      .objectStore('pendingRequests')
      .put({method, options}));
  }

  static retryRequests() {
    return idbPromise.then(db => {
      return db.transaction('pendingRequests').objectStore('pendingRequests').getAll()
        .then(pendingRequests =>
          Promise.all(pendingRequests.map(ps =>
            self.DBHelper[ps.method](...ps.options.params)
              .then(() => {
                if (!ps.options.tempId) {
                  return;
                }
                return db
                  .transaction(ps.options.objectStore, 'readwrite')
                  .objectStore(ps.options.objectStore)
                  .delete(ps.options.tempId);
              })
              .then(() => db.transaction('pendingRequests', 'readwrite').objectStore('pendingRequests').delete(ps.id))
              // We don't want every promise to stop just because one gives an error
              .catch(e => e))));
    });
  }
};

self.addEventListener('online', self.DBHelper.retryRequests);
