import { parity } from '../../fixtures/parity';
import { AdminOverviewDrawerScreen } from '../../pages/admin-overview.page';
import { AdminRecordsPage } from '../../pages/admin-records.page';

// jb-admin-shell: the ink top bar at both widths, and the sidebar of tables beside the screen from
// 1024 px, on the Members table; under 1024 px the drawer of tables over the overview.
parity('admin-shell', {
  cases: [
    {
      name: 'top',
      route: 'admin-records',
      screen: (page) => new AdminRecordsPage(page),
      region: (screen: AdminRecordsPage) => screen.adminTop,
    },
    {
      name: 'sidebar',
      route: 'admin-records',
      screen: (page) => new AdminRecordsPage(page),
      region: (screen: AdminRecordsPage) => screen.sidebar,
      widths: [1280],
      knownDifference:
        "The mock's sidebar lists the Events and Event RSVPs tables (L2-311); the app has no Events yet.",
    },
    {
      name: 'drawer',
      route: 'admin-overview.drawer',
      screen: (page) => new AdminOverviewDrawerScreen(page),
      region: (screen: AdminOverviewDrawerScreen) => screen.drawer.locator('.admin-drawer__panel'),
      widths: [360],
      knownDifference:
        "The mock's sidebar lists the Events and Event RSVPs tables (L2-311); the app has no Events yet.",
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
