self.restaurants = [];
self.neighborhoods = [];
self.cuisines = [];
self.markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Load and register pre-caching Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
  self.fetchNeighborhoods();
  self.fetchCuisines();
  self.updateRestaurants();
  self.imgsObserver = self.lozad('.restaurant-img');
  self.imgsObserver.observe();
});

/**
 * Fetch all neighborhoods and set their HTML.
 * @returns {undefined}
 */
self.fetchNeighborhoods = () => {
  self.DBHelper.fetchNeighborhoods()
    .then(neighborhoods => {
      self.neighborhoods = neighborhoods;
      self.fillNeighborhoodsHTML();
    })
    .catch(console.error);
};

/**
 * Set neighborhoods HTML.
 * @param {string[]} neighborhoods The neighborhoods to set into the HTML.
 * @returns {undefined}
 */
self.fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  select.querySelector('option[value="all"]').setAttribute('aria-setsize', neighborhoods.length + 1);
  neighborhoods.forEach((neighborhood, i) => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    // Accessibility tags to make sure the screen reader knows the ComboBox elements number and position
    option.setAttribute('aria-posinset', i + 2);
    option.setAttribute('aria-setsize', neighborhoods.length + 1);
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 * @returns {undefined}
 */
self.fetchCuisines = () => {
  self.DBHelper.fetchCuisines()
    .then(cuisines => {
      self.cuisines = cuisines;
      self.fillCuisinesHTML();
    })
    .catch(console.error);
};

/**
 * Set cuisines HTML.
 * @param {string[]} cuisines The cuisines to set into the HTML.
 * @returns {undefined}
 */
self.fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');
  select.querySelector('option[value="all"]').setAttribute('aria-setsize', cuisines.length + 1);
  cuisines.forEach((cuisine, i) => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    // Accessibility tags to make sure the screen reader knows the ComboBox elements number and position
    option.setAttribute('aria-posinset', i + 2);
    option.setAttribute('aria-setsize', cuisines.length + 1);
    select.append(option);
  });
};

/**
 * Initialize Google map, called from HTML.
 * @returns {undefined}
 */
window.enableMap = () => {
  const mapEnablerButton = document.getElementById('map-enabler');
  const mapContainer = document.getElementById('map-container');
  let mapInitialized = false;
  let mapShowing = false;
  mapEnablerButton.addEventListener('click', () => {
    if (!mapInitialized) {
      let loc = {
        lat: 40.722216,
        lng: -73.987501,
      };
      self.map = new self.google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: loc,
        scrollwheel: false,
      });
      self.addMarkersToMap();
      mapInitialized = true;
    }
    mapShowing = !mapShowing;
    mapContainer.classList.toggle('shown');
    // We have to use this strategy to preserve the a11y
    mapEnablerButton.innerText = mapShowing ? 'Hide map' : 'Show map';
  });
  mapEnablerButton.hidden = false;
};

/**
 * Update page and map for current restaurants.
 * @returns {undefined}
 */
self.updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  self.DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
    .then(restaurants => {
      self.resetRestaurants(restaurants);
      self.fillRestaurantsHTML();
      self.imgsObserver.observe();
    })
    .catch(console.error);
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 * @param {object[]} restaurants The restaurants to set after clearing the old ones out.
 * @returns {undefined}
 */
self.resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 * @param {object[]} restaurants The restaurants to add to the HTML.
 * @returns {undefined}
 */
self.fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(self.createRestaurantHTML(restaurant));
  });
};

/**
 * Create restaurant HTML.
 * @param {object} restaurant The restaurant to create the HTML for.
 * @returns {HTMLLIElement | undefined} The HTML li tag of the restaurant.
 */
self.createRestaurantHTML = (restaurant) => {
  if (!restaurant) {
    return;
  }

  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  const urls = self.DBHelper.imageUrlsForRestaurant(restaurant);
  image.dataset.src = urls['2x'];
  image.dataset.srcset = Object.entries(urls).reduce((arr, [k, v]) => arr.concat(`${v} ${k}`), []).join(', ');
  image.title = image.alt = restaurant.name;
  li.append(image);

  const info = document.createElement('div');
  info.className = 'restaurant-info';

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  info.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  info.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  info.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = self.DBHelper.urlForRestaurant(restaurant);
  info.append(more);

  li.append(info);

  return li;
};

/**
 * Add markers for current restaurants to the map.
 * @param {object[]} restaurants The restaurants to add to the map.
 * @returns {undefined}
 */
self.addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = self.DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    self.google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
};
