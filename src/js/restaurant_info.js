/**
 * Initialize Google map, called from HTML.
 * @returns {undefined}
 */
window.initMap = () => {
  self.fetchRestaurantFromURL()
    .then(restaurant => {
      self.map = new self.google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false,
      });
      self.fillBreadcrumb();
      self.DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    })
    .catch(console.error);
};

/**
 * Get current restaurant from page URL.
 * @returns {Promise<object | Error>} A promise that resolves to the restaurant fetched from the url.
 */
self.fetchRestaurantFromURL = () => {
  if (self.restaurant) {
    return Promise.resolve(self.restaurant);
  }

  const id = self.getParameterByName('id');
  if (!id) { // no id found in URL
    return Promise.reject(new Error('No restaurant id in URL'));
  }
  return self.DBHelper.fetchRestaurantById(id)
    .then(restaurant => {
      self.restaurant = restaurant;
      self.fillRestaurantHTML();
      return restaurant;
    })
    .catch(console.error);
};

/**
 * Create restaurant HTML and add it to the webpage.
 * @param {object} restaurant The restaurant to add to the webpage.
 * @returns {undefined}
 */
self.fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  const urls = self.DBHelper.imageUrlsForRestaurant(restaurant);
  image.src = urls['2x'];
  image.srcset = Object.entries(urls).reduce((arr, [k, v]) => arr.concat(`${v} ${k}`), []).join(', ');
  image.title = image.alt = restaurant.name;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    self.fillRestaurantHoursHTML();
  }
  // fill reviews
  self.fillReviewsHTML();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 * @param {object[]} operatingHours The operating hours to add to the webpage.
 * @returns {undefined}
 */
self.fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (const [key, operatingHour] of Object.entries(operatingHours)) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = `<b>${key}</b>`;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHour;
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 * @param {object[]} reviews The reviews to add to the webpage.
 * @returns {undefined}
 */
self.fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(self.createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 * @param {object} review The review to create the HTML of.
 * @returns {HTMLLIElement | undefined} The HTML li tag of the review.
 */
self.createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('h4');
  name.innerHTML = review.name;
  li.appendChild(name);

  const container = document.createElement('div');
  container.className = 'rating-date-container';

  const rating = document.createElement('div');
  rating.className = 'rating';
  for (let i = 0; i < 5; i++) {
    const star = document.createElement('i');
    star.className = `${i < review.rating ? 'fas' : 'far'} fa-star`;
    rating.appendChild(star);
  }
  container.appendChild(rating);

  const date = document.createElement('div');
  date.className = 'date';
  date.innerHTML = review.date;
  container.appendChild(date);

  li.appendChild(container);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 * @param {object} restaurant The restaurant to get the name from.
 * @returns {undefined}
 */
self.fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 * @param {string} name The parameter name to get the value of.
 * @param {string} url The url to parse the parameters from.
 * @returns {string | null} The value of the parameter.
 */
self.getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};