import { parity } from '../../fixtures/parity';
import { AdminOverviewPage, AdminOverviewLoadingScreen } from '../../pages/admin-overview.page';

// jb-system-list: a failed job run, outbox messages retrying and given up, and maintenance under
// way (L2-275 AC1–AC3), and its skeletons while the overview loads.
parity('system-list', {
  cases: [
    {
      name: 'overview',
      route: 'admin-overview',
      screen: (page) => new AdminOverviewPage(page),
      region: (screen: AdminOverviewPage) => screen.system,
    },
    {
      name: 'loading',
      route: 'admin-overview.loading',
      screen: (page) => new AdminOverviewLoadingScreen(page),
      region: (screen: AdminOverviewLoadingScreen) => screen.system,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
