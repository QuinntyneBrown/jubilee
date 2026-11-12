import { parity } from '../../fixtures/parity';
import { BusinessPage } from '../../pages/business.page';

// jb-rating-summary: the average, the stars, the count, the five bars and the note on "Verified".
parity('rating-summary', {
  cases: [
    {
      name: 'default',
      route: 'business',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.reviews.summary,
    },
  ],
  reference: {
    crops: [
      {
        case: 'default',
        width: 1280,
        frame: 'listing-reviews-section-1280.png',
        clip: { x: 30, y: 60, width: 310, height: 300 },
        knownDifference:
          'The frame counts 137 reviews and says Verified means a booking through Jubilee; the product counts the seeded 5 and says the listing confirmed the reviewer’s request (ADR 0058).',
      },
    ],
  },
});
