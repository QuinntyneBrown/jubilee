import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';
import { BusinessCard } from '../../pages/business-card';

// jb-rating-inline: "★ 4.6 (5)" on the Legacy Financial card of the browse home.
parity('rating-inline', {
  cases: [
    {
      name: 'card',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) =>
        new BusinessCard(screen.featuredCards.filter({ hasText: 'Legacy Financial' })).rating,
    },
  ],
  reference: {
    absent:
      'The captured home frames draw businesses as photo cards with the rating over the photo; the app draws the tinted tile, a known difference of the home page.',
    nearestFrame: 'home-1280.png',
  },
});
