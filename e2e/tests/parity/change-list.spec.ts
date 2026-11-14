import { parity } from '../../fixtures/parity';
import { AdminOverviewPage } from '../../pages/admin-overview.page';

// jb-change-list: the four newest audit records (L2-275 AC4).
parity('change-list', {
  cases: [
    {
      name: 'overview',
      route: 'admin-overview',
      screen: (page) => new AdminOverviewPage(page),
      region: (screen: AdminOverviewPage) => screen.changes,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
