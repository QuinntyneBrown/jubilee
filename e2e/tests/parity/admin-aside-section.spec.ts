import { parity } from '../../fixtures/parity';
import { AdminOverviewPage } from '../../pages/admin-overview.page';

// jb-admin-aside-section: Recent changes with "Audit log" beside its title (L2-275 AC4).
parity('admin-aside-section', {
  cases: [
    {
      name: 'changes',
      route: 'admin-overview',
      screen: (page) => new AdminOverviewPage(page),
      region: (screen: AdminOverviewPage) => screen.changesSection,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
