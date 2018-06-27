/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Load and register pre-caching Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
  self.fetchRestaurantFromURL()
    .then(() => self.fillBreadcrumb());

  const newReviewLi = document.querySelector('.new-review');
  const newReviewForm = document.forms[0];
  const submit = newReviewForm.querySelector('button');
  const name = newReviewForm.querySelector('[name="new-review-name"]');
  const description = newReviewForm.querySelector('[name="new-review-description"]');
  const ratings = Array.from(newReviewForm.querySelectorAll('[name="new-review-rating"] > .material-icons'));
  let selectedRating;
  const formIsValid = () => !!name.value && !!description.value && !!selectedRating;
  const resetForm = () => {
    name.value = '';
    description.value = '';
    selectedRating = undefined;
    ratings.forEach((star) => {
      star.setAttribute('aria-checked', 'false');
      star.textContent = 'star_border';
    });
    submit.disabled = true;
  };

  name.addEventListener('input', () => submit.disabled = !formIsValid());
  description.addEventListener('input', () => submit.disabled = !formIsValid());
  ratings.forEach((star) => {
    const listener = (e) => {
      if (e.keyCode && e.keyCode !== 32) {
        return;
      } else if (e.keyCode === 32) {
        // Little hack to avoid scrolling to the bottom of the page when pressing space
        e.preventDefault();
      }
      const starPos = ratings.indexOf(star);
      selectedRating = starPos + 1;
      for (let i = 0; i < ratings.length; i++) {
        ratings[i].setAttribute('aria-checked', (i === starPos).toString());
        ratings[i].textContent = (i <= starPos) ? 'star' : 'star_border';
      }
      submit.disabled = !formIsValid();
    };
    star.addEventListener('click', listener);
    star.addEventListener('keydown', listener);
  });
  submit.addEventListener('click', (event) => {
    event.preventDefault();
    const id = parseInt(self.getParameterByName('id'), 10);
    if (!formIsValid() || !id) {
      return false;
    }
    newReviewLi.parentNode.insertBefore(self.createReviewHTML({
      name: name.value,
      rating: selectedRating,
      comments: description.value,
      updatedAt: Date.now(),
    }), newReviewLi.nextSibling);
    self.DBHelper.addReview(id, name.value, selectedRating, description.value);
    resetForm();
  });
});

/**
 * Initialize Google map, called from HTML.
 * @returns {undefined}
 */
window.enableMap = () => {
  const mapEnablerButton = document.getElementById('map-enabler');
  let mapInitialized = false;
  mapEnablerButton.addEventListener('click', () => {
    if (!mapInitialized) {
      self.fetchRestaurantFromURL().then(restaurant => {
        self.map = new self.google.maps.Map(document.getElementById('map'), {
          zoom: 16,
          center: restaurant.latlng,
          scrollwheel: false,
        });
        self.DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
        mapInitialized = true;
      })
        .catch(console.error);
    }
    document.getElementById('map-container').classList.add('shown');
  });
  mapEnablerButton.disabled = false;
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
  reviews.sort((a, b) => new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf()).forEach(review =>
    ul.appendChild(self.createReviewHTML(review))
  );
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
    star.className = 'material-icons';
    star.textContent = i < review.rating ? 'star' : 'star_border';
    rating.appendChild(star);
  }
  container.appendChild(rating);

  const date = document.createElement('div');
  date.className = 'date';
  date.innerHTML = new Date(review.updatedAt).toLocaleDateString();
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
