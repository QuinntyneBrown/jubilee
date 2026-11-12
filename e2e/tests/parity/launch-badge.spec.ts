import { parity } from '../../fixtures/parity';
import { MarketingHomePage } from '../../pages/marketing-home.page';

// jb-launch-badge: the label "Launching soon" above the heading of the marketing page.
parity('launch-badge', {
  cases: [
    {
      name: 'opening',
      route: 'marketing-home',
      screen: (page) => new MarketingHomePage(page),
      region: (screen: MarketingHomePage) => screen.badge,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns design has no launching-soon frame (ADR 0044); the mocks are the source.',
    nearestFrame: 'home-1280.png',
  },
});
