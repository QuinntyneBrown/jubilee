import { parity } from '../../fixtures/parity';
import { AdminRecordsPage } from '../../pages/admin-records.page';

// jb-admin-shell: the ink top bar at both widths, and the sidebar of tables beside the screen from
// 1024 px, on the Members table.
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
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
