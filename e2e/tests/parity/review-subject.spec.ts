import { parity } from '../../fixtures/parity';
import { WriteReviewPage } from '../../pages/write-review.page';

// jb-review-subject: a business with its category, and a space with its host.
parity('review-subject', {
  cases: [
    {
      name: 'business',
      route: 'write-review',
      screen: (page) => new WriteReviewPage(page),
      region: (screen: WriteReviewPage) => screen.subject,
    },
    {
      name: 'space',
      route: 'write-review.space',
      screen: (page) => new WriteReviewPage(page),
      region: (screen: WriteReviewPage) => screen.subject,
    },
  ],
  reference: {
    absent:
      'The Write a Review frame shows the listing beside a photo the product does not use (the category tile stands in); the subject has not been measured for a crop yet.',
    nearestFrame: 'write-review-1280.png',
  },
});
