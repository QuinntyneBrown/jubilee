import { parity } from '../../fixtures/parity';
import { AdminPolicyPage } from '../../pages/admin-policy.page';
import { PolicyPage } from '../../pages/policy.page';

// jb-policy-document: a policy page as members read it (L2-107 to L2-109), and the preview of a
// draft in the admin application's editor (L2-241).
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
    {
      name: 'preview',
      route: 'admin-policy',
      screen: (page) => new AdminPolicyPage(page),
      region: (screen: AdminPolicyPage) => screen.document,
    },
  ],
  reference: {
    absent: 'The captured Magic Patterns frames show no policy page.',
    nearestFrame: 'home-1280.png',
  },
});
