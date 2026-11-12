import { parity } from '../../fixtures/parity';
import { BusinessPage } from '../../pages/business.page';
import { ProductPage } from '../../pages/product.page';

// jb-rating-link: the rating under a listing's and a product's name, and "No reviews yet".
parity('rating-link', {
  cases: [
    {
      name: 'listing',
      route: 'business',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.reviews.ratingLink,
    },
    {
      name: 'product',
      route: 'product',
      screen: (page) => new ProductPage(page),
      region: (screen: ProductPage) => screen.reviews.ratingLink,
    },
    {
      name: 'none',
      route: 'business.reviews-empty',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.reviews.ratingLink,
    },
  ],
  reference: {
    absent:
      'The rating under the name is only in the full-page Listing capture, whose header has not been measured for a crop yet; the section capture holds the summary.',
    nearestFrame: 'listing-reviews-1280.png',
  },
});
