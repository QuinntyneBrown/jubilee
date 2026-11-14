import { parity } from '../../fixtures/parity';
import { AdminBulkStatusMenuScreen, AdminSelectedScreen } from '../../pages/admin-records.page';

// jb-bulk-bar: the bar two selected members bring up (L2-280 AC3), and its "Set status" menu
// opened upward with each status as its pill (L2-280 AC4).
parity('bulk-bar', {
  cases: [
    {
      name: 'selected',
      route: 'admin-records.selected',
      screen: (page) => new AdminSelectedScreen(page),
      region: (screen: AdminSelectedScreen) => screen.bulkBar,
    },
    {
      name: 'status-menu',
      route: 'admin-records.bulk-status-menu',
      screen: (page) => new AdminBulkStatusMenuScreen(page),
      region: (screen: AdminBulkStatusMenuScreen) => screen.statusMenu,
      widths: [1280],
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
