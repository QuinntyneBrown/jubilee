import { parity } from '../../fixtures/parity';
import { AdminRecordsPage } from '../../pages/admin-records.page';

// jb-status-pill: a member's status in the Members table.
parity('status-pill', {
  cases: [
    {
      name: 'in-a-table',
      route: 'admin-records',
      screen: (page) => new AdminRecordsPage(page),
      region: (screen: AdminRecordsPage) => screen.statusPills.first(),
      widths: [1280],
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
