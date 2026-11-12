import { parity } from '../../fixtures/parity';
import { BrowsePage } from '../../pages/browse.page';

// jb-saveable: a card with its heart (L2-041 AC7, AC8, ADR 0054), unsaved, saved, busy and focused,
// as pages/browse/saved-hearts.html draws them.
parity('saveable', {
  cases: [
    {
      name: 'unsaved',
      route: 'browse',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.featuredSaveable(3),
    },
    {
      name: 'saved',
      route: 'browse.saved-hearts',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.featuredSaveable(0),
    },
    {
      name: 'busy',
      route: 'browse.saved-hearts',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.featuredSaveable(1),
      arrange: (screen: BrowsePage) => screen.arrangeHeartStates(),
    },
    {
      name: 'focused',
      route: 'browse.saved-hearts',
      screen: (page) => new BrowsePage(page),
      region: (screen: BrowsePage) => screen.featuredSaveable(2),
      arrange: (screen: BrowsePage) => screen.arrangeHeartStates(),
    },
  ],
  reference: {
    absent:
      'The Magic Patterns design draws no heart on its cards; the heart takes the round save action of its business page head.',
    nearestFrame: 'business-services-1280.png',
  },
});
