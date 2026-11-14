import { parity } from '../../fixtures/parity';
import { AdminOverviewPage } from '../../pages/admin-overview.page';

// jb-work-grid: the overview's work queue with System and Recent changes beside it from 1024 px.
parity('work-grid', {
  cases: [
    {
      name: 'overview',
      route: 'admin-overview',
      screen: (page) => new AdminOverviewPage(page),
      region: (screen: AdminOverviewPage) => screen.grid,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
