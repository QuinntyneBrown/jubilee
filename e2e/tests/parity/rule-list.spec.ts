import { parity } from '../../fixtures/parity';
import { MarketingHomePage } from '../../pages/marketing-home.page';

// jb-rule-list on paper, jb-point-list on ink and jb-marketing-steps on the surface.
parity('rule-list', {
  cases: [
    {
      name: 'rules',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.ruleList,
    },
    {
      name: 'points',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.pointList,
    },
    {
      name: 'steps',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.stepList,
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames are of the app; none shows the marketing site.',
    nearestFrame: 'home-1280.png',
  },
});
