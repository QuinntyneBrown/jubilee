import { parity } from '../../fixtures/parity';
import { MarketingHomePage } from '../../pages/marketing-home.page';

// jb-marketing-nav and jb-marketing-footer, the two bars that frame the marketing site.
parity('marketing-nav', {
  cases: [
    {
      name: 'nav',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.topBar,
    },
    {
      name: 'footer',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.footer,
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames are of the app; none shows the marketing site.',
    nearestFrame: 'home-1280.png',
  },
});
