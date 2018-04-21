let restaurants = [];
let neighborhoods = [];
let cuisines = [];
var markers = [];
var map;

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Load and register pre-caching Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods()
    .then(neighborhoods => {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    })
    .catch(console.error);
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
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
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines()
    .then(cuisines => {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    })
    .catch(console.error);
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
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
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
    .then(restaurants => {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    })
    .catch(console.error);
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
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
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  if (!restaurant) {
    return;
  }

  const li = document.createElement('li');

  if (restaurant.photograph) {
    const image = document.createElement('img');
    image.className = 'restaurant-img';
    const urls = DBHelper.imageUrlsForRestaurant(restaurant);
    image.src = urls['2x'];
    image.srcset = Object.entries(urls).reduce((arr, [k, v]) => arr.concat(`${v} ${k}`), []).join(', ');
    image.title = image.alt = restaurant.name;
    li.append(image);
  }

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
  more.href = DBHelper.urlForRestaurant(restaurant);
  info.append(more);

  li.append(info);

  return li;
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
};
