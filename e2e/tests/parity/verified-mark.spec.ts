import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';

// jb-verified-mark: the check and the word, under a card.
parity('verified-mark', {
  cases: [
    {
      name: 'card',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.featuredCard(1).verifiedMark,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns home shows "Verified" under a card only inside the photo cards the app does not draw yet; the difference is recorded with the home page.',
    nearestFrame: 'home-1280.png',
  },
});
