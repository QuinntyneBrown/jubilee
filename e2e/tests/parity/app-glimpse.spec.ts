import { parity } from '../../fixtures/parity';
import { MarketingHomePage } from '../../pages/marketing-home.page';

// jb-app-glimpse with its two jb-floating-note on the marketing site.
parity('app-glimpse', {
  cases: [
    {
      name: 'glimpse',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.glimpse,
    },
    {
      name: 'note-trust',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.glimpseNotes.first(),
    },
    {
      name: 'note-reply',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.glimpseNotes.last(),
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames are of the app; none shows the marketing site.',
    nearestFrame: 'home-1280.png',
  },
});
