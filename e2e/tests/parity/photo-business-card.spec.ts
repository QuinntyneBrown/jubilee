import { parity } from '../../fixtures/parity';
import { MarketingHomePage } from '../../pages/marketing-home.page';

// jb-photo-business-card on the marketing site: the featured card and one of the four beside it.
parity('photo-business-card', {
  cases: [
    {
      name: 'featured',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.featuredCards.first(),
    },
    {
      name: 'card',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.cards.nth(1),
    },
  ],
  reference: {
    absent:
      'The captured Magic Patterns frames are of the app; none shows the marketing site. The app home in the nearest frame draws a similar photo card.',
    nearestFrame: 'home-1280.png',
  },
});
