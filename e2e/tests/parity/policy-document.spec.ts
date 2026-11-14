import { parity } from '../../fixtures/parity';
import { PolicyPage } from '../../pages/policy.page';

// jb-policy-document: a policy page as members read it (L2-107 to L2-109).
parity('policy-document', {
  cases: [
    {
      name: 'terms',
      route: 'terms',
      screen: (page) => new PolicyPage(page),
      region: (screen: PolicyPage) => screen.article,
    },
    {
      name: 'privacy',
      route: 'privacy',
      screen: (page) => new PolicyPage(page),
      region: (screen: PolicyPage) => screen.article,
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames show no policy page.',
    nearestFrame: 'home-1280.png',
  },
});
