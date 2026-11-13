import { parity } from '../../fixtures/parity';
import { BusinessPage } from '../../pages/business.page';

// jb-stars: the summary's stars filled to the average (4.6), and the small stars of one review.
parity('stars', {
  cases: [
    {
      name: 'average',
      route: 'business',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.reviews.summaryStars,
    },
    {
      name: 'review',
      route: 'business',
      screen: (page) => new BusinessPage(page),
      region: (screen: BusinessPage) => screen.reviews.review(0).stars,
    },
  ],
  reference: {
    crops: [
      {
        case: 'average',
        width: 1280,
        frame: 'listing-reviews-section-1280.png',
        clip: { x: 138, y: 72, width: 96, height: 18 },
        knownDifference:
          'The frame fills five stars for 4.8; the seeded sample is 4.6, so the fifth star is filled six tenths (ADR 0066).',
      },
    ],
  },
});
