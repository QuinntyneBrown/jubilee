import { parity } from '../../fixtures/parity';
import { AdminRecordsPage } from '../../pages/admin-records.page';

// jb-records-filter: the status chips of the Members table, All pressed.
parity('records-filter', {
  cases: [
    {
      name: 'members',
      route: 'admin-records',
      screen: (page) => new AdminRecordsPage(page),
      region: (screen: AdminRecordsPage) => screen.statusFilter,
    },
  ],
  reference: {
    absent:
      'The Magic Patterns "Jubilee Admin" design is not captured here; its frames are drawn in the admin mocks.',
    nearestFrame: 'home-1280.png',
  },
});
