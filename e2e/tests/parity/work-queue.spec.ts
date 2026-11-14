import { parity } from '../../fixtures/parity';
import { AdminOverviewPage, AdminOverviewLoadingScreen } from '../../pages/admin-overview.page';

// jb-work-queue: the overview's Safety section with its lines, the section all clear, and its
// skeletons while the overview loads (L2-274).
parity('work-queue', {
  cases: [
    {
      name: 'safety',
      route: 'admin-overview',
      screen: (page) => new AdminOverviewPage(page),
      region: (screen: AdminOverviewPage) => screen.queues.first(),
    },
    {
      name: 'clear',
      route: 'admin-overview.empty',
      screen: (page) => new AdminOverviewPage(page),
      region: (screen: AdminOverviewPage) => screen.queues.first(),
    },
    {
      name: 'loading',
      route: 'admin-overview.loading',
      screen: (page) => new AdminOverviewLoadingScreen(page),
      region: (screen: AdminOverviewLoadingScreen) => screen.queues.first(),
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
