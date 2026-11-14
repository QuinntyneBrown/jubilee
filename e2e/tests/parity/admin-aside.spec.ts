import { parity } from '../../fixtures/parity';
import { AdminOverviewPage } from '../../pages/admin-overview.page';

// jb-admin-aside: System and Recent changes beside the overview's work queue (L2-275).
parity('admin-aside', {
  cases: [
    {
      name: 'overview',
      route: 'admin-overview',
      screen: (page) => new AdminOverviewPage(page),
      region: (screen: AdminOverviewPage) => screen.aside,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
